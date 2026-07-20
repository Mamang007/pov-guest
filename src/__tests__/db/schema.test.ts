import { hosts, rooms, photos } from '../../db/schema'
import { getTableColumns } from 'drizzle-orm'

describe('Database Schema', () => {
  it('should define hosts table with correct columns', () => {
    const columns = getTableColumns(hosts)
    expect(columns.id).toBeDefined()
    expect(columns.name).toBeDefined()
    expect(columns.email).toBeDefined()
    expect(columns.passwordHash).toBeDefined()
    expect(columns.createdAt).toBeDefined()
  })

  it('should define rooms table with correct columns', () => {
    const columns = getTableColumns(rooms)
    expect(columns.id).toBeDefined()
    expect(columns.hostId).toBeDefined()
    expect(columns.name).toBeDefined()
    expect(columns.code).toBeDefined()
    expect(columns.presetFilter).toBeDefined()
    expect(columns.createdAt).toBeDefined()
  })

  it('should define photos table with correct columns', () => {
    const columns = getTableColumns(photos)
    expect(columns.id).toBeDefined()
    expect(columns.roomId).toBeDefined()
    expect(columns.guestName).toBeDefined()
    expect(columns.imageUrl).toBeDefined()
    expect(columns.filterApplied).toBeDefined()
    expect(columns.createdAt).toBeDefined()
  })
})
