import { Test, TestingModule } from '@nestjs/testing';
import { CRDTService } from './crdt.service';
import { Queue } from 'bull';
import { ShardRouterService } from '@/sharding/shardRouter.service';

describe('CRDTService', () => {
  let service: CRDTService;
  let mockQueue: Partial<Queue>;
  let mockPrismaClient: any;
  let shardRouterService: ShardRouterService;

  beforeEach(async () => {
    mockPrismaClient = {
      list: {
        findUnique: jest.fn(),
        update: jest.fn(),
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
            writeWithQuorum: jest.fn().mockImplementation(async (_, fn) => {
              return await fn(mockPrismaClient);
            }),
            getShardForUser: jest.fn().mockReturnValue({ name: 'shard1' }),
            getShardsForKey: jest.fn().mockReturnValue(['shard1']),
            getAllShardClients: jest.fn().mockResolvedValue([mockPrismaClient]),
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

  describe('resolveChanges', () => {
    const baseList = {
      id: 'list1',
      name: 'Original List',
      items: [],
      ownerId: 'user1',
      deleted: false,
      updatedAt: '2023-12-09T12:00:00Z',
      lastEditorUsername: 'user1',
    };

    beforeEach(() => {
      mockPrismaClient.list.findUnique.mockResolvedValue(baseList);
    });

    it('should handle concurrent list name changes by using the latest timestamp', async () => {
      const changes = [
        {
          id: '1',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'First Change',
            deleted: false,
            updatedAt: '2023-12-09T12:01:00Z',
            lastEditorUsername: 'user1',
            items: [],
          }),
        },
        {
          id: '2',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'Second Change',
            deleted: false,
            updatedAt: '2023-12-09T12:02:00Z',
            lastEditorUsername: 'user2',
            items: [],
          }),
        },
      ];

      await service.resolveChanges(changes as any, 'list1', 'user1');

      expect(mockPrismaClient.list.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            name: 'Second Change',
            lastEditorUsername: 'user2',
          }),
        }),
      );
    });

    it('should merge concurrent item changes correctly', async () => {
      const changes = [
        {
          id: '1',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'List with Items',
            deleted: false,
            updatedAt: '2023-12-09T12:01:00Z',
            lastEditorUsername: 'user1',
            items: [
              {
                id: 'item1',
                name: 'Item 1',
                quantity: 1,
                checked: false,
                deleted: false,
                updatedAt: '2023-12-09T12:01:00Z',
                listId: 'list1',
                lastEditorUsername: 'user1',
              },
            ],
          }),
        },
        {
          id: '2',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'List with Items',
            deleted: false,
            updatedAt: '2023-12-09T12:02:00Z',
            lastEditorUsername: 'user2',
            items: [
              {
                id: 'item1',
                name: 'Item 1 Updated',
                quantity: 2,
                checked: true,
                deleted: false,
                updatedAt: '2023-12-09T12:02:00Z',
                listId: 'list1',
                lastEditorUsername: 'user2',
              },
            ],
          }),
        },
      ];

      await service.resolveChanges(changes as any, 'list1', 'user1');

      expect(mockPrismaClient.list.update).toHaveBeenCalledWith({
        where: { id: 'list1' },
        data: {
          items: {
            upsert: [
              {
                where: { id: 'item1' },
                create: {
                  id: 'item1',
                  name: 'Item 1 Updated',
                  quantity: 2,
                  checked: true,
                  deleted: false,
                  updatedAt: '2023-12-09T12:02:00Z',
                  lastEditorUsername: 'user2',
                },
                update: {
                  id: 'item1',
                  name: 'Item 1 Updated',
                  quantity: 2,
                  checked: true,
                  deleted: false,
                  updatedAt: '2023-12-09T12:02:00Z',
                  lastEditorUsername: 'user2',
                },
              },
            ],
          },
        },
        include: { items: true },
      });
    });

    it('should handle item deletion correctly', async () => {
      const changes = [
        {
          id: '1',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'List with Deleted Item',
            deleted: false,
            updatedAt: '2023-12-09T12:01:00Z',
            lastEditorUsername: 'user1',
            items: [
              {
                id: 'item1',
                name: 'Item to Delete',
                quantity: 1,
                checked: false,
                deleted: true,
                updatedAt: '2023-12-09T12:01:00Z',
                listId: 'list1',
                lastEditorUsername: 'user1',
              },
            ],
          }),
        },
      ];

      await service.resolveChanges(changes as any, 'list1', 'user1');

      expect(mockPrismaClient.list.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            items: {
              upsert: [
                expect.objectContaining({
                  update: expect.objectContaining({
                    deleted: true,
                  }),
                }),
              ],
            },
          },
        }),
      );
    });

    it('should handle multiple concurrent item operations', async () => {
      const changes = [
        // User 1 adds items
        {
          id: '1',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'Shopping List',
            deleted: false,
            updatedAt: '2023-12-09T12:01:00Z',
            lastEditorUsername: 'user1',
            items: [
              {
                id: 'item1',
                name: 'Apples',
                quantity: 3,
                checked: false,
                deleted: false,
                updatedAt: '2023-12-09T12:01:00Z',
                listId: 'list1',
                lastEditorUsername: 'user1',
              },
              {
                id: 'item2',
                name: 'Bananas',
                quantity: 2,
                checked: false,
                deleted: false,
                updatedAt: '2023-12-09T12:01:00Z',
                listId: 'list1',
                lastEditorUsername: 'user1',
              },
            ],
          }),
        },
        // User 2 modifies item1 and adds item3
        {
          id: '2',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'Shopping List',
            deleted: false,
            updatedAt: '2023-12-09T12:02:00Z',
            lastEditorUsername: 'user2',
            items: [
              {
                id: 'item1',
                name: 'Red Apples',
                quantity: 4,
                checked: true,
                deleted: false,
                updatedAt: '2023-12-09T12:02:00Z',
                listId: 'list1',
                lastEditorUsername: 'user2',
              },
              {
                id: 'item3',
                name: 'Oranges',
                quantity: 5,
                checked: false,
                deleted: false,
                updatedAt: '2023-12-09T12:02:00Z',
                listId: 'list1',
                lastEditorUsername: 'user2',
              },
            ],
          }),
        },
      ];

      await service.resolveChanges(changes as any, 'list1', 'user1');

      // Verify that the final state includes all changes correctly merged
      expect(mockPrismaClient.list.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            items: {
              upsert: expect.arrayContaining([
                // Updated item1
                expect.objectContaining({
                  where: { id: 'item1' },
                  update: expect.objectContaining({
                    name: 'Red Apples',
                    quantity: 4,
                    checked: true,
                  }),
                }),
                // Original item2
                expect.objectContaining({
                  where: { id: 'item2' },
                  update: expect.objectContaining({
                    name: 'Bananas',
                    quantity: 2,
                  }),
                }),
                // New item3
                expect.objectContaining({
                  where: { id: 'item3' },
                  create: expect.objectContaining({
                    name: 'Oranges',
                    quantity: 5,
                  }),
                }),
              ]),
            },
          },
        }),
      );
    });

    it('should handle list deletion based on timestamp', async () => {
      const changes = [
        // First change marks the list as deleted
        {
          id: '1',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'List to Delete',
            deleted: true,
            updatedAt: '2023-12-09T12:01:00Z',
            lastEditorUsername: 'user1',
            items: [],
          }),
        },
        // Later change tries to update the list
        {
          id: '2',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'Updated List',
            deleted: false,
            updatedAt: '2023-12-09T12:02:00Z', // More recent timestamp
            lastEditorUsername: 'user2',
            items: [],
          }),
        },
      ];

      await service.resolveChanges(changes as any, 'list1', 'user1');

      // The list should NOT be deleted because the most recent change has deleted: false
      expect(mockPrismaClient.list.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'list1' },
          create: {
            id: 'list1',
            name: 'Updated List',
            lastEditorUsername: 'user2',
            owner: { connect: { id: 'user1' } },
            updatedAt: '2023-12-09T12:02:00Z',
          },
          update: {
            name: 'Updated List',
            lastEditorUsername: 'user2',
            updatedAt: '2023-12-09T12:02:00Z',
          },
        }),
      );

      // Reset the mock
      jest.clearAllMocks();

      // Now test with deletion as the most recent change
      const changesWithRecentDelete = [
        {
          id: '1',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'Updated List',
            deleted: false,
            updatedAt: '2023-12-09T12:01:00Z',
            lastEditorUsername: 'user1',
            items: [],
          }),
        },
        {
          id: '2',
          listId: 'list1',
          changes: JSON.stringify({
            id: 'list1',
            name: 'List to Delete',
            deleted: true,
            updatedAt: '2023-12-09T12:02:00Z', // More recent timestamp
            lastEditorUsername: 'user2',
            items: [],
          }),
        },
      ];

      await service.resolveChanges(
        changesWithRecentDelete as any,
        'list1',
        'user1',
      );

      expect(mockPrismaClient.list.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'list1' },
          create: expect.objectContaining({
            id: 'list1',
            name: 'List to Delete',
            deleted: true,
            lastEditorUsername: 'user2',
            ownerId: 'user1',
            updatedAt: '2023-12-09T12:02:00Z',
          }),
          update: expect.objectContaining({
            deleted: true,
            lastEditorUsername: 'user2',
            updatedAt: '2023-12-09T12:02:00Z',
          }),
        }),
      );
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

  // Error cases
  describe('error handling', () => {
    it('should throw error for empty changes array', async () => {
      await expect(
        service.resolveChanges([], 'list1', 'user1'),
      ).rejects.toThrow('No changes provided for resolution');
    });

    it('should throw error for missing list ID', async () => {
      await expect(
        service.resolveChanges([{}] as any, '', 'user1'),
      ).rejects.toThrow('Invalid or missing list ID');
    });

    it('should throw error for missing user ID', async () => {
      await expect(
        service.resolveChanges([{}] as any, 'list1', ''),
      ).rejects.toThrow('Invalid or missing user ID');
    });

    it('should throw error when list not found', async () => {
      mockPrismaClient.list.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveChanges(
          [
            {
              id: '1',
              listId: 'nonexistent',
              changes: JSON.stringify({
                id: 'nonexistent',
                name: 'Non-existent List',
                deleted: false,
                updatedAt: '2023-12-09T12:00:00Z',
                lastEditorUsername: 'user1',
                items: [],
              }),
            },
          ] as any,
          'nonexistent',
          'user1',
        ),
      ).rejects.toThrow(/List with ID .* not found/);
    });
  });
});
