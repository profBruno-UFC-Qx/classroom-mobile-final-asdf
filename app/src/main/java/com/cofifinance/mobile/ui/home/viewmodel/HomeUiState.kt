package com.cofifinance.mobile.ui.home.viewmodel

import com.cofifinance.mobile.data.local.entity.SpendingEntity

data class HomeUiState(
    val spendings: List<SpendingEntity> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)
