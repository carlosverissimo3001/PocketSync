import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CrdtConsumer } from './crdt.consumer';
import { ZmqModule } from '@/zmq/zmq.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crdt',
    }),
    ZmqModule,
    PrismaModule,
  ],
  providers: [CrdtConsumer],
  exports: [BullModule],
})
export class CRDTModule {
  private lists: Map<string, { value: any; updatedAt: Date }>;

  constructor() {
    this.lists = new Map();
  }

  /**
   * Add or update a list in the CRDT state
   * @param id - Unique identifier for the list
   * @param value - List value (e.g., contents or metadata)
   * @param updatedAt - Timestamp of the update
   */
  addOrUpdateList(id: string, value: any, updatedAt: Date): void {
    const existingList = this.lists.get(id);

    if (!existingList || updatedAt > existingList.updatedAt) {
      this.lists.set(id, { value, updatedAt });
    }
  }

  /**
   * Remove a list based on ID, if the timestamp is newer
   * @param id - Unique identifier for the list
   * @param updatedAt - Timestamp of the update
   */
  removeList(id: string, updatedAt: Date): void {
    const existingList = this.lists.get(id);

    if (!existingList || updatedAt > existingList.updatedAt) {
      this.lists.delete(id);
    }
  }

  /**
   * Merge incoming lists with the existing state
   * @param incomingLists - Array of lists with their IDs, values, and timestamps
   * @returns An array of merged lists
   */
  mergeLists(
    incomingLists: { id: string; value: any; updatedAt: Date }[],
  ): { id: string; value: any; updatedAt: Date }[] {
    const resolvedMap = new Map<string, { value: any; updatedAt: Date }>();

    // Adiciona todas as listas existentes ao mapa resolvido
    for (const [id, data] of this.lists) {
      resolvedMap.set(id, data);
    }

    // Mistura as listas recebidas
    for (const list of incomingLists) {
      const existingList = resolvedMap.get(list.id);

      if (!existingList || list.updatedAt > existingList.updatedAt) {
        resolvedMap.set(list.id, { value: list.value, updatedAt: list.updatedAt });
      }
    }

    // Atualiza o estado local
    this.lists = resolvedMap;

    // Retorna as listas misturadas como array
    return Array.from(resolvedMap.entries()).map(([id, data]) => ({
      id,
      value: data.value,
      updatedAt: data.updatedAt,
    }));
  }

  /**
   * Get all lists as an array
   */
  getAllLists(): { id: string; value: any; updatedAt: Date }[] {
    return Array.from(this.lists.entries()).map(([id, data]) => ({
      id,
      value: data.value,
      updatedAt: data.updatedAt,
    }));
  }
}
