package com.cofifinance.mobile.data.repository

import com.cofifinance.mobile.data.local.entity.SyncStatus
import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.SpendingDto
import com.cofifinance.mobile.support.FakeSpendingApiService
import com.cofifinance.mobile.support.FakeSpendingDao
import com.cofifinance.mobile.support.httpException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SpendingRepositoryTest {

    private lateinit var api: FakeSpendingApiService
    private lateinit var dao: FakeSpendingDao
    private lateinit var repo: SpendingRepository

    @Before
    fun setUp() {
        api = FakeSpendingApiService()
        dao = FakeSpendingDao()
        repo = SpendingRepository(api, dao)
    }

    // ── pull: server → local ────────────────────────────────────────────────

    @Test
    fun `pull inserts server items absent from local`() = runTest {
        api.listHandler = { ApiEnvelope(listOf(remoteSpending("s1"))) }

        repo.sync()

        val all = dao.getAll()
        assertEquals(1, all.size)
        assertEquals("s1", all[0].id)
        assertEquals(SyncStatus.SYNCED, all[0].syncStatus)
    }

    @Test
    fun `pull does not overwrite PENDING_UPDATE local row`() = runTest {
        val localPending = localSpending("s1", SyncStatus.PENDING_UPDATE, name = "local name")
        dao.upsert(localPending)
        api.listHandler = { ApiEnvelope(listOf(remoteSpending("s1", name = "server name"))) }

        repo.sync()

        val row = dao.getById("s1")!!
        assertEquals("local name", row.name)
        assertEquals(SyncStatus.PENDING_UPDATE, row.syncStatus)
    }

    @Test
    fun `pull does not overwrite PENDING_DELETE local row when push fails`() = runTest {
        dao.upsert(localSpending("s1", SyncStatus.PENDING_DELETE))
        // push fails → row stays PENDING_DELETE; pull should not overwrite it
        api.deleteHandler = { throw httpException(500) }
        api.listHandler = { ApiEnvelope(listOf(remoteSpending("s1", name = "server name"))) }

        repo.sync()

        val row = dao.getById("s1")!!
        assertEquals(SyncStatus.PENDING_DELETE, row.syncStatus)
    }

    @Test
    fun `pull removes SYNCED local row absent from server response`() = runTest {
        dao.upsert(localSpending("old", SyncStatus.SYNCED))
        api.listHandler = { ApiEnvelope(emptyList()) }

        repo.sync()

        assertTrue(dao.getAll().isEmpty())
    }

    @Test
    fun `pull does not remove PENDING_CREATE row absent from server response`() = runTest {
        val pending = localSpending("tmp-uuid", SyncStatus.PENDING_CREATE)
        dao.upsert(pending)
        // create handler throws so the push fails; we're testing pull isolation
        api.createHandler = { throw httpException(500) }
        api.listHandler = { ApiEnvelope(emptyList()) }

        repo.sync()

        // row should still be present (as PENDING_CREATE, not deleted)
        val row = dao.getById("tmp-uuid")
        assertTrue(row != null)
        assertEquals(SyncStatus.PENDING_CREATE, row!!.syncStatus)
    }

    // ── push: PENDING_CREATE ─────────────────────────────────────────────────

    @Test
    fun `push PENDING_CREATE calls POST and replaces temp id with server id`() = runTest {
        dao.upsert(localSpending("tmp-1", SyncStatus.PENDING_CREATE))
        api.createHandler = { ApiEnvelope(remoteSpending("server-1")) }
        api.listHandler = { ApiEnvelope(listOf(remoteSpending("server-1"))) }

        repo.sync()

        assertTrue(dao.getById("tmp-1") == null)
        val serverRow = dao.getById("server-1")
        assertEquals(SyncStatus.SYNCED, serverRow?.syncStatus)
        assertEquals(1, api.createCalls.size)
    }

    @Test
    fun `push PENDING_CREATE on API failure leaves row in PENDING_CREATE`() = runTest {
        dao.upsert(localSpending("tmp-2", SyncStatus.PENDING_CREATE))
        api.createHandler = { throw httpException(500) }
        api.listHandler = { ApiEnvelope(emptyList()) }

        repo.sync()

        val row = dao.getById("tmp-2")
        assertEquals(SyncStatus.PENDING_CREATE, row?.syncStatus)
    }

    // ── push: PENDING_UPDATE ─────────────────────────────────────────────────

    @Test
    fun `push PENDING_UPDATE calls PATCH and marks row SYNCED`() = runTest {
        dao.upsert(localSpending("s1", SyncStatus.PENDING_UPDATE))
        api.updateHandler = { id, _ -> ApiEnvelope(remoteSpending(id)) }
        api.listHandler = { ApiEnvelope(listOf(remoteSpending("s1"))) }

        repo.sync()

        assertEquals(SyncStatus.SYNCED, dao.getById("s1")?.syncStatus)
        assertEquals(1, api.updateCalls.size)
        assertEquals("s1", api.updateCalls[0].first)
    }

    @Test
    fun `push PENDING_UPDATE on API failure leaves row in PENDING_UPDATE`() = runTest {
        dao.upsert(localSpending("s1", SyncStatus.PENDING_UPDATE))
        api.updateHandler = { _, _ -> throw httpException(500) }
        api.listHandler = { ApiEnvelope(emptyList()) }

        repo.sync()

        assertEquals(SyncStatus.PENDING_UPDATE, dao.getById("s1")?.syncStatus)
    }

    // ── push: PENDING_DELETE ─────────────────────────────────────────────────

    @Test
    fun `push PENDING_DELETE calls DELETE and removes row locally`() = runTest {
        dao.upsert(localSpending("s1", SyncStatus.PENDING_DELETE))
        api.listHandler = { ApiEnvelope(emptyList()) }

        repo.sync()

        assertTrue(dao.getById("s1") == null)
        assertEquals(listOf("s1"), api.deleteCalls)
    }

    @Test
    fun `push PENDING_DELETE on API failure leaves row in PENDING_DELETE`() = runTest {
        dao.upsert(localSpending("s1", SyncStatus.PENDING_DELETE))
        api.deleteHandler = { throw httpException(500) }
        api.listHandler = { ApiEnvelope(emptyList()) }

        repo.sync()

        assertEquals(SyncStatus.PENDING_DELETE, dao.getById("s1")?.syncStatus)
    }

    // ── CRUD facades ─────────────────────────────────────────────────────────

    @Test
    fun `createSpending writes PENDING_CREATE row and triggers sync`() = runTest {
        api.createHandler = { ApiEnvelope(remoteSpending("server-new", name = it.name)) }
        api.listHandler = { ApiEnvelope(listOf(remoteSpending("server-new", name = "Coffee"))) }

        repo.createSpending(name = "Coffee", category = "Food", price = 5.0)

        assertEquals(1, api.createCalls.size)
        assertEquals("Coffee", api.createCalls[0].name)
        // after successful sync the PENDING_CREATE is gone and server row is present
        assertTrue(dao.getById("server-new") != null)
    }

    @Test
    fun `updateSpending writes PENDING_UPDATE row and triggers sync`() = runTest {
        dao.upsert(localSpending("s1", SyncStatus.SYNCED))
        api.updateHandler = { id, body -> ApiEnvelope(remoteSpending(id, name = body.name)) }
        api.listHandler = { ApiEnvelope(listOf(remoteSpending("s1", name = "Updated"))) }

        repo.updateSpending(
            id = "s1",
            name = "Updated",
            category = "Food",
            price = 10.0,
            spentAt = "2026-01-01T00:00:00Z",
        )

        assertEquals(1, api.updateCalls.size)
        assertEquals("Updated", api.updateCalls[0].second.name)
    }

    @Test
    fun `deleteSpending marks row PENDING_DELETE and triggers sync`() = runTest {
        dao.upsert(localSpending("s1", SyncStatus.SYNCED))
        api.listHandler = { ApiEnvelope(emptyList()) }

        repo.deleteSpending("s1")

        assertEquals(listOf("s1"), api.deleteCalls)
        assertTrue(dao.getById("s1") == null)
    }

    @Test
    fun `spendings flow excludes PENDING_DELETE rows`() = runTest {
        dao.upsert(localSpending("visible", SyncStatus.SYNCED))
        dao.upsert(localSpending("hidden", SyncStatus.PENDING_DELETE))

        val visible = repo.spendings.first()

        assertEquals(1, visible.size)
        assertEquals("visible", visible[0].id)
    }

    @Test
    fun `sync does not crash when API is unreachable`() = runTest {
        api.listHandler = { throw httpException(503) }
        api.createHandler = { throw httpException(503) }

        // Should not throw
        repo.sync()
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun remoteSpending(id: String, name: String = "Coffee") = SpendingDto(
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
    )

    private fun localSpending(
        id: String,
        syncStatus: SyncStatus,
        name: String = "Coffee",
    ) = com.cofifinance.mobile.data.local.entity.SpendingEntity(
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
