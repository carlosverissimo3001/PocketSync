import { Test, TestingModule } from '@nestjs/testing';
import { CRDTConsumer } from './crdt.consumer';
import { CRDTService } from './crdt.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ZmqService } from '@/zmq/zmq.service';
import { Job } from 'bull';

describe('CRDTConsumer', () => {
  let consumer: CRDTConsumer;
  let crdtService: CRDTService;
  let prismaService: PrismaService;
  let zmqService: ZmqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CRDTConsumer,
        {
          provide: CRDTService,
          useValue: { resolveChanges: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            bufferedChange: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
            },
            list: { findMany: jest.fn() },
          },
        },
        {
          provide: ZmqService,
          useValue: { publishUserLists: jest.fn() },
        },
      ],
    }).compile();

    consumer = module.get<CRDTConsumer>(CRDTConsumer);
    crdtService = module.get<CRDTService>(CRDTService);
    prismaService = module.get<PrismaService>(PrismaService);
    zmqService = module.get<ZmqService>(ZmqService);
  });

  describe('handleProcessBuffer', () => {
    it('should handle empty sync correctly', async () => {
      const job = { data: { isEmptySync: true, userId: '123' } } as Job;
      jest.spyOn(prismaService.list, 'findMany').mockResolvedValue([]);
      jest.spyOn(zmqService, 'publishUserLists').mockResolvedValue();

      await consumer.handleProcessBuffer(job);

      expect(prismaService.list.findMany).toHaveBeenCalledWith({
        where: { ownerId: '123' },
        include: { items: true },
      });
      expect(zmqService.publishUserLists).toHaveBeenCalledWith('123', []);
    });

    it('should log and rethrow errors', async () => {
      const job = { data: { isEmptySync: false, userId: '123', requesterId: '456' } } as Job;
      jest.spyOn(prismaService.bufferedChange, 'findMany').mockRejectedValue(new Error('DB Error'));

      await expect(consumer.handleProcessBuffer(job)).rejects.toThrow('DB Error');
    });
  });
});
