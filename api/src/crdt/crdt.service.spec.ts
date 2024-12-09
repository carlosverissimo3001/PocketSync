import { Test, TestingModule } from '@nestjs/testing';
import { CRDTService } from './crdt.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Queue } from 'bull';

describe('CRDTService', () => {
  let service: CRDTService;
  let prismaService: PrismaService;
  let mockQueue: Partial<Queue>;

  beforeEach(async () => {
    mockQueue = {
      getJobs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CRDTService,
        {
          provide: PrismaService,
          useValue: {
            list: {
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            bufferedChange: {
              createMany: jest.fn(),
            },
          },
        },
        {
          provide: 'BullQueue_crdt',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<CRDTService>(CRDTService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('addToBuffer', () => {
    it('should add lists to the buffer', async () => {
      jest.spyOn(prismaService.bufferedChange, 'createMany').mockResolvedValue(undefined);

      await service.addToBuffer('user1', [
        { id: 'list1', name: 'List 1' } as any,
      ]);

      expect(prismaService.bufferedChange.createMany).toHaveBeenCalled();
    });

    it('should throw an error for invalid input', async () => {
      await expect(service.addToBuffer('user1', [])).rejects.toThrow('Invalid input for buffering');
    });
  });
});
