import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ListsService } from './lists.service';
import { CreateListDto } from 'src/dtos/create-list.dto';
import { List } from 'src/entities/list.entity';

@Controller('lists')
export class ListsController {
  constructor(private listsService: ListsService) {}

  @Post()
  async listHandler(@Body() body: List[]) {
    console.log("Syncing lists", body);
    return this.listsService.listHandler(body);
  }

  @Get()
  async getLists(@Body('userId') userId: string) {
    return this.listsService.getLists(userId);
  }

  @Get(':id')
  async getList(@Param('id') id: string) {
    return this.listsService.getList(id);
  }
}
