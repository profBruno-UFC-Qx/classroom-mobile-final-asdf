package com.cofifinance.mobile.ui.home.viewmodel

import com.cofifinance.mobile.data.local.entity.SpendingEntity

data class HomeUiState(
    val spendings: List<SpendingEntity> = emptyList(),
    val pendingDeleteId: String? = null,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
) {
    val visibleSpendings: List<SpendingEntity>
        get() = if (pendingDeleteId == null) spendings
                else spendings.filter { it.id != pendingDeleteId }
}
