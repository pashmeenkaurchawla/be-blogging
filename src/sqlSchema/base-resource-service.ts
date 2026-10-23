import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { IBaseResourceService } from 'src/sqlSchema/interfaces/base-resource.interface';
import { BaseEntity } from 'src/sqlSchema/interfaces/base.entity';

export class BaseResourceService<
  T extends BaseEntity,
> implements IBaseResourceService<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async findById(id: number): Promise<T | null> {
    const where = { id } as FindOptionsWhere<T>;
    return this.repository.findOne({ where });
  }

  async findOne(conditions: FindOptionsWhere<T>): Promise<T | null> {
    return this.repository.findOne({ where: conditions });
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: DeepPartial<T>): Promise<T> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Resource with id=${id} not found`);
    }
    const merged = this.repository.merge(existing, data);
    return this.repository.save(merged);
  }

  async delete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Resource with id=${id} not found`);
    }
    await this.repository.remove(existing);
  }
}
