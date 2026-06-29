package com.cofifinance.mobile.data.local

import com.cofifinance.mobile.data.local.entity.SpendingEntity
import com.cofifinance.mobile.data.local.entity.SyncStatus
import com.cofifinance.mobile.support.FakeSpendingDao
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Validates the SpendingDao contract via FakeSpendingDao — the same interface the
 * Room-generated DAO must satisfy. These tests document expected DAO behaviour and
 * keep the fake honest so SpendingRepositoryTest can rely on it.
 */
class SpendingDaoTest {

    private lateinit var dao: FakeSpendingDao

    @Before
    fun setUp() {
        dao = FakeSpendingDao()
    }

    @Test
    fun `upsert inserts a new row`() = runTest {
        dao.upsert(spending("a", SyncStatus.SYNCED))

        assertEquals(1, dao.getAll().size)
        assertEquals("a", dao.getAll()[0].id)
    }

    @Test
    fun `upsert replaces row with same id`() = runTest {
        dao.upsert(spending("a", SyncStatus.SYNCED, name = "original"))
        dao.upsert(spending("a", SyncStatus.PENDING_UPDATE, name = "updated"))

        val all = dao.getAll()
        assertEquals(1, all.size)
        assertEquals("updated", all[0].name)
        assertEquals(SyncStatus.PENDING_UPDATE, all[0].syncStatus)
    }

    @Test
    fun `upsertAll inserts multiple rows`() = runTest {
        dao.upsertAll(listOf(spending("a", SyncStatus.SYNCED), spending("b", SyncStatus.SYNCED)))

        assertEquals(2, dao.getAll().size)
    }

    @Test
    fun `getPending returns only non-SYNCED rows`() = runTest {
        dao.upsert(spending("synced", SyncStatus.SYNCED))
        dao.upsert(spending("create", SyncStatus.PENDING_CREATE))
        dao.upsert(spending("update", SyncStatus.PENDING_UPDATE))
        dao.upsert(spending("delete", SyncStatus.PENDING_DELETE))

        val pending = dao.getPending()

        assertEquals(3, pending.size)
        assertTrue(pending.none { it.syncStatus == SyncStatus.SYNCED })
    }

    @Test
    fun `deleteById removes the row`() = runTest {
        dao.upsert(spending("a", SyncStatus.SYNCED))
        dao.deleteById("a")

        assertTrue(dao.getAll().isEmpty())
    }

    @Test
    fun `deleteById on missing id does not throw`() = runTest {
        dao.deleteById("nonexistent")
    }

    @Test
    fun `deleteByIds removes only the specified rows`() = runTest {
        dao.upsert(spending("a", SyncStatus.SYNCED))
        dao.upsert(spending("b", SyncStatus.SYNCED))
        dao.upsert(spending("c", SyncStatus.SYNCED))

        dao.deleteByIds(listOf("a", "c"))

        val all = dao.getAll()
        assertEquals(1, all.size)
        assertEquals("b", all[0].id)
    }

    @Test
    fun `updateSyncStatus changes status without touching other fields`() = runTest {
        dao.upsert(spending("a", SyncStatus.PENDING_UPDATE, name = "My Name"))

        dao.updateSyncStatus("a", SyncStatus.SYNCED)

        val row = dao.getById("a")!!
        assertEquals(SyncStatus.SYNCED, row.syncStatus)
        assertEquals("My Name", row.name)
    }

    @Test
    fun `updateSyncStatus on missing id does nothing`() = runTest {
        dao.updateSyncStatus("ghost", SyncStatus.SYNCED)
    }

    @Test
    fun `getById returns null for unknown id`() = runTest {
        assertNull(dao.getById("nope"))
    }

    @Test
    fun `getAllFlow excludes PENDING_DELETE rows`() = runTest {
        dao.upsert(spending("visible", SyncStatus.SYNCED))
        dao.upsert(spending("hidden", SyncStatus.PENDING_DELETE))

        val emitted = dao.getAllFlow().first()

        assertEquals(1, emitted.size)
        assertEquals("visible", emitted[0].id)
    }

    @Test
    fun `getAllFlow emits updated list after insert`() = runTest {
        val firstEmit = dao.getAllFlow().first()
        assertTrue(firstEmit.isEmpty())

        dao.upsert(spending("a", SyncStatus.SYNCED))

        val secondEmit = dao.getAllFlow().first()
        assertEquals(1, secondEmit.size)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun spending(id: String, syncStatus: SyncStatus, name: String = "Coffee") =
        SpendingEntity(
            id = id,
            userId = 1L,
            name = name,
            category = "Food",
            price = 5.0,
            observation = null,
            spentAt = "2026-01-01T00:00:00Z",
            orderNumber = 1,
            createdAt = "2026-01-01T00:00:00Z",
            updatedAt = "2026-01-01T00:00:00Z",
            syncStatus = syncStatus,
        )
}
