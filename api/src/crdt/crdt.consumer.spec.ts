import { Test, TestingModule } from '@nestjs/testing';
import { CRDTConsumer } from './crdt.consumer';
import { CRDTService } from './crdt.service';
import { ZmqService } from '@/zmq/zmq.service';
import { Job } from 'bull';
import { ShardRouterService } from '@/sharding/shardRouter.service';

describe('CRDTConsumer', () => {
  let consumer: CRDTConsumer;
  let crdtService: CRDTService;
  let zmqService: ZmqService;
  let mockPrismaClient: any;

  beforeEach(async () => {
    mockPrismaClient = {
      bufferedChange: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      list: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CRDTConsumer,
        {
          provide: CRDTService,
          useValue: {
            resolveChanges: jest.fn(),
            cleanupResolvedBufferChanges: jest.fn(),
          },
        },
        {
          provide: ShardRouterService,
          useValue: {
            getShardForUser: jest.fn().mockReturnValue({ name: 'shard-1' }),
            getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
          },
        },
        {
          provide: ZmqService,
          useValue: { publishUserLists: jest.fn() },
        },
        {
          provide: 'BullQueue_crdt',
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    consumer = module.get<CRDTConsumer>(CRDTConsumer);
    crdtService = module.get<CRDTService>(CRDTService);
    zmqService = module.get<ZmqService>(ZmqService);
  });

  describe('handleProcessBuffer', () => {
    it('should handle empty sync correctly', async () => {
      const job = { data: { isEmptySync: true, userId: '123' } } as Job;
      mockPrismaClient.list.findMany.mockResolvedValue([]);
      jest.spyOn(zmqService, 'publishUserLists').mockResolvedValue();

      await consumer.handleProcessBuffer(job);

      expect(mockPrismaClient.list.findMany).toHaveBeenCalledWith({
        where: { ownerId: '123' },
        include: { items: true },
      });
      expect(zmqService.publishUserLists).toHaveBeenCalledWith('123', []);
    });

    it('should process buffered changes', async () => {
      const job = {
        data: { isEmptySync: false, userId: '123', requesterId: '456' },
      } as Job;

      mockPrismaClient.bufferedChange.findMany.mockResolvedValue([
        {
          id: '1',
          userId: '123',
          listId: 'list1',
          changes: JSON.stringify({ name: 'List 1', items: [] }),
          timestamp: new Date(),
          resolved: false,
          isProcessing: false,
        },
      ]);
      jest
        .spyOn(crdtService, 'resolveChanges')
        .mockResolvedValue({ id: 'list1' } as any);
      mockPrismaClient.bufferedChange.updateMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaClient.list.findMany.mockResolvedValue([{ id: 'list1' }]);
      jest.spyOn(zmqService, 'publishUserLists').mockResolvedValue();

      await consumer.handleProcessBuffer(job);

      expect(mockPrismaClient.bufferedChange.findMany).toHaveBeenCalledWith({
        where: { userId: '123', resolved: false },
        orderBy: { timestamp: 'asc' },
      });
      expect(crdtService.resolveChanges).toHaveBeenCalledWith(
        expect.any(Array),
        'list1',
        '123',
      );
      expect(mockPrismaClient.bufferedChange.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['1'] } },
        data: { resolved: true },
      });
      expect(zmqService.publishUserLists).toHaveBeenCalledWith('123', [
        { id: 'list1' },
      ]);
    });

    it('should log and rethrow errors', async () => {
      const job = {
        data: { isEmptySync: false, userId: '123', requesterId: '456' },
      } as Job;
      mockPrismaClient.bufferedChange.findMany.mockRejectedValue(
        new Error('DB Error'),
      );

      await expect(consumer.handleProcessBuffer(job)).rejects.toThrow(
        'DB Error',
      );
    });

    it('should handle multiple lists with buffered changes', async () => {
      const job = {
        data: { isEmptySync: false, userId: '123', requesterId: '456' },
      } as Job;

      mockPrismaClient.bufferedChange.findMany.mockResolvedValue([
        {
          id: '1',
          userId: '123',
          listId: 'list1',
          changes: JSON.stringify({ name: 'List 1', items: [] }),
          timestamp: new Date(),
          resolved: false,
        },
        {
          id: '2',
          userId: '123',
          listId: 'list2',
          changes: JSON.stringify({ name: 'List 2', items: [] }),
          timestamp: new Date(),
          resolved: false,
        },
      ]);

      jest
        .spyOn(crdtService, 'resolveChanges')
        .mockResolvedValue({ id: 'list1' } as any);
      mockPrismaClient.list.findMany.mockResolvedValue([
        { id: 'list1' },
        { id: 'list2' },
      ]);

      await consumer.handleProcessBuffer(job);

      expect(crdtService.resolveChanges).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.bufferedChange.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
        data: { resolved: true },
      });
    });

    it('should handle case when no unresolved changes are found', async () => {
      const job = {
        data: { isEmptySync: false, userId: '123', requesterId: '456' },
      } as Job;

      mockPrismaClient.bufferedChange.findMany.mockResolvedValue([]);

      await consumer.handleProcessBuffer(job);

      expect(crdtService.resolveChanges).not.toHaveBeenCalled();
      expect(mockPrismaClient.bufferedChange.updateMany).not.toHaveBeenCalled();
      expect(mockPrismaClient.list.findMany).not.toHaveBeenCalled();
      expect(zmqService.publishUserLists).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database errors during empty sync', async () => {
      mockPrismaClient.list.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(consumer['handleEmptySync']('123')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle ZMQ publishing errors', async () => {
      mockPrismaClient.list.findMany.mockResolvedValue([{ id: '1' }]);
      jest
        .spyOn(zmqService, 'publishUserLists')
        .mockRejectedValue(new Error('ZMQ error'));

      await expect(consumer['handleEmptySync']('123')).rejects.toThrow(
        'ZMQ error',
      );
    });
  });

  describe('handleEmptySync', () => {
    it('should handle empty sync with lists', async () => {
      mockPrismaClient.list.findMany.mockResolvedValue([{ id: '1' }]);
      jest.spyOn(zmqService, 'publishUserLists').mockResolvedValue();

      await consumer['handleEmptySync']('123');

      expect(mockPrismaClient.list.findMany).toHaveBeenCalledWith({
        where: { ownerId: '123' },
        include: { items: true },
      });
      expect(zmqService.publishUserLists).toHaveBeenCalledWith('123', [
        { id: '1' },
      ]);
    });

    it('should handle empty sync with no lists', async () => {
      mockPrismaClient.list.findMany.mockResolvedValue([]);
      jest.spyOn(zmqService, 'publishUserLists').mockResolvedValue();

      await consumer['handleEmptySync']('123');

      expect(mockPrismaClient.list.findMany).toHaveBeenCalledWith({
        where: { ownerId: '123' },
        include: { items: true },
      });
      expect(zmqService.publishUserLists).toHaveBeenCalledWith('123', []);
    });
  });

  describe('onModuleInit', () => {
    it('should schedule buffer cleanup job', async () => {
      const mockAdd = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(consumer['crdtQueue'], 'add').mockImplementation(mockAdd);

      await consumer.onModuleInit();

      expect(mockAdd).toHaveBeenCalledWith(
        'cleanup-buffer',
        {},
        {
          repeat: { cron: expect.any(String) },
        },
      );
    });
  });

  describe('handleBufferCleanup', () => {
    it('should successfully clean up resolved buffer changes', async () => {
      const mockCleanupResult = { count: 5 };
      jest
        .spyOn(crdtService, 'cleanupResolvedBufferChanges')
        .mockResolvedValue(mockCleanupResult);

      const result = await consumer.handleBufferCleanup();

      expect(crdtService.cleanupResolvedBufferChanges).toHaveBeenCalled();
      expect(result).toEqual(mockCleanupResult);
    });

    it('should handle cleanup errors', async () => {
      jest
        .spyOn(crdtService, 'cleanupResolvedBufferChanges')
        .mockRejectedValue(new Error('Cleanup failed'));

      await expect(consumer.handleBufferCleanup()).rejects.toThrow(
        'Cleanup failed',
      );
    });
  });
});
