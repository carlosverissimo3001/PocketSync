import { List } from '@/entities/list.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { ZmqService } from '@/zmq/zmq.service';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { CRDTModule } from './crdt.module';

@Injectable()
@Processor('crdt')
export class CrdtConsumer {
  private crdtModule: CRDTModule;

  constructor(
    private readonly zmqService: ZmqService,
    private readonly prisma: PrismaService,
    @InjectQueue('crdt') private readonly crdtQueue: Queue,
  ) {
    this.crdtModule = new CRDTModule();
  }

  @Process('resolve-conflicts')
  async handleConflicts(job: Job<{ userId: string; lists: List[] }>) {
    const userId = job.data.userId; // Último user que editou a lista
    const incomingLists = job.data.lists;

    if (incomingLists.length === 0) {
      await this.handleEmptySync(userId);
      return;
    }

    // Obtém o estado atual da DB
    const existingLists = await this.prisma.list.findMany({
      where: { ownerId: incomingLists[0].ownerId },
      include: { items: true, lastEditor: true }, 
    });

    // Mistura as listas recebidas com o estado local usando o CRDTModule
    const mergedLists = this.crdtModule.mergeLists(
      incomingLists.map((list) => ({
        id: list.id,
        value: {
          ...list,
          lastEditorId: userId, // Define o último editor com o `userId`
        },
        updatedAt: list.updatedAt,
      })),
    );

    // Atualiza a DB com as listas misturadas
    for (const list of mergedLists) {
      await this.prisma.list.upsert({
        where: { id: list.id },
        create: { ...list.value, ownerId: list.value.ownerId, lastEditorId: userId },
        update: { ...list.value, lastEditorId: userId },
      });
    }

    // Publica as listas resolvidas para sincronização
    await this.zmqService.publishUserLists(
      incomingLists[0].ownerId, // Publica para o `ownerId`
      mergedLists.map((entry) => entry.value),
    );
  }

  private async handleEmptySync(userId: string): Promise<void> {
    // Lida com o caso de sincronização quando a lista está vazia
    await this.prisma.list.deleteMany({ where: { ownerId: userId } });
    await this.zmqService.publishUserLists(userId, []);
  }
}
