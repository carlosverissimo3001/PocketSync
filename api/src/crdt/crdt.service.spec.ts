import { Test, TestingModule } from '@nestjs/testing';
import { CRDTService } from './crdt.service';
import { Queue } from 'bull';
import { ShardRouterService } from '@/sharding/shardRouter.service';

describe('CRDTService', () => {
  let service: CRDTService;
  let mockQueue: Partial<Queue>;
  let mockPrismaClient: any;
  let shardRouterService: ShardRouterService;
  let mockDate: Date;

  beforeEach(async () => {
    mockDate = new Date('2023-11-16T18:00:00Z');
    jest.useFakeTimers({ advanceTimers: true });
    jest.setSystemTime(mockDate);

    mockPrismaClient = {
      list: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      bufferedChange: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    mockQueue = {
      getJobs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CRDTService,
        {
          provide: ShardRouterService,
          useValue: {
            getShardClientForKey: jest.fn().mockResolvedValue(mockPrismaClient),
          },
        },
        {
          provide: 'BullQueue_crdt',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<CRDTService>(CRDTService);
    shardRouterService = module.get<ShardRouterService>(ShardRouterService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('resolveChanges', () => {
    it('should resolve changes and update the list', async () => {
      const mockList = {
        id: 'list1',
        name: 'Original List',
        items: [],
        owner: { id: 'owner1' },
      };

      mockPrismaClient.list.findUnique.mockResolvedValue(mockList);
      mockPrismaClient.list.upsert.mockResolvedValue({
        ...mockList,
        name: 'Updated List',
      });

      const result = await service.resolveChanges(
        [
          {
            id: '1',
            listId: 'list1',
            changes: JSON.stringify({
              id: 'list1',
              name: 'Updated List',
              updatedAt: '2023-12-09T12:00:00Z',
              deleted: false,
              lastEditorUsername: 'user1',
              items: [],
            }),
          } as any,
        ],
        'list1',
        'user1',
      );

      expect(result.name).toBe('Updated List');
      expect(mockPrismaClient.list.upsert).toHaveBeenCalled();
    });

    it('should handle deleted lists', async () => {
      mockPrismaClient.list.upsert.mockResolvedValue({
        id: 'list1',
        deleted: true,
      });

      const result = await service.resolveChanges(
        [
          {
            id: '1',
            listId: 'list1',
            changes: JSON.stringify({
              id: 'list1',
              name: 'Deleted List',
              deleted: true,
              updatedAt: '2023-12-09T12:00:00Z',
              lastEditorUsername: 'user1',
              items: [],
            }),
          } as any,
        ],
        'list1',
        'user1',
      );

      expect(result.deleted).toBe(true);
    });
  });

  describe('cleanupResolvedBufferChanges', () => {
    it('should cleanup old resolved changes', async () => {
      mockPrismaClient.bufferedChange.deleteMany.mockResolvedValue({
        count: 5,
      });

      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const result = await service.cleanupResolvedBufferChanges();

      expect(result.count).toBe(5);
      expect(mockPrismaClient.bufferedChange.deleteMany).toHaveBeenCalledWith({
        where: {
          AND: [{ resolved: true }, { timestamp: { lt: oneHourAgo } }],
        },
      });
    });
  });

  describe('getLatestNameChange', () => {
    it('should return the most recent change name for new list', async () => {
      const changes = [
        {
          changes: {
            id: 'list1',
            name: 'New List',
            deleted: false,
            updatedAt: '2023-12-09T12:00:00Z',
            lastEditorUsername: 'user1',
            items: [],
          },
        },
        {
          changes: {
            id: 'list1',
            name: 'New List.2',
            deleted: false,
            updatedAt: '2023-12-09T12:01:00Z',
            lastEditorUsername: 'user1',
            items: [],
          },
        },
      ];

      const result = await service.getLatestNameChange(
        changes,
        'TEST list' as any,
      );
      expect(result).toBe('New List.2');
    });

    it('should return existing name if no changes', async () => {
      const changes = [
        {
          changes: {
            id: 'list1',
            name: 'Same Name',
            deleted: false,
            updatedAt: '2023-12-09T12:00:00Z',
            lastEditorUsername: 'user1',
            items: [],
          } as any,
        },
      ];
      const list = { name: 'Same Name' };

      const result = await service.getLatestNameChange(changes, list as any);
      expect(result).toBe('Same Name');
    });
  });

  describe('addToBuffer', () => {
    it('should add lists to the buffer', async () => {
      const mockList = {
        id: 'list1',
        name: 'List 1',
        ownerId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
        items: [],
        lastEditorUsername: 'user1',
      };

      jest
        .spyOn(mockPrismaClient.bufferedChange, 'createMany')
        .mockResolvedValue(undefined);

      await service.addToBuffer('user1', [mockList]);

      expect(mockPrismaClient.bufferedChange.createMany).toHaveBeenCalled();
    });

    it('should throw an error for invalid input', async () => {
      await expect(service.addToBuffer('user1', [])).rejects.toThrow(
        'Invalid input for buffering',
      );
    });
  });

  describe('isJobAlreadyQueuedForUser', () => {
    it('should return true if a job is already queued', async () => {
      (mockQueue.getJobs as jest.Mock).mockResolvedValue([
        { data: { userId: 'user1' } },
      ]);

      const result = await service.isJobAlreadyQueuedForUser('user1');
      expect(result).toBe(true);
    });

    it('should return false if no job is queued', async () => {
      (mockQueue.getJobs as jest.Mock).mockResolvedValue([]);

      const result = await service.isJobAlreadyQueuedForUser('user1');
      expect(result).toBe(false);
    });
  });
});
