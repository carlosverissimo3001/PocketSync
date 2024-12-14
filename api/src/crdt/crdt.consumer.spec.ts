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
          useValue: { resolveChanges: jest.fn() },
        },
        {
          provide: ShardRouterService,
          useValue: {
            getShardClientForKey: jest.fn().mockResolvedValue(mockPrismaClient),
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
      // Add this mock for the final list fetch
      mockPrismaClient.list.findMany.mockResolvedValue([{ id: 'list1' }]);
      jest.spyOn(zmqService, 'publishUserLists').mockResolvedValue();

      await consumer.handleProcessBuffer(job);

      expect(mockPrismaClient.bufferedChange.findMany).toHaveBeenCalledWith({
        where: { userId: '123', resolved: false },
        orderBy: { timestamp: 'asc' },
      });
      expect(crdtService.resolveChanges).toHaveBeenCalledWith(
        [
          {
            id: '1',
            userId: '123',
            listId: 'list1',
            changes: JSON.stringify({ name: 'List 1', items: [] }),
            timestamp: expect.any(Date),
            resolved: false,
            isProcessing: false,
          },
        ],
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
  });

  describe('handleEmptySync', () => {
    it('should handle empty sync with lists', async () => {
      mockPrismaClient.list.findMany.mockResolvedValue([{ id: '1' } as any]);
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
});
