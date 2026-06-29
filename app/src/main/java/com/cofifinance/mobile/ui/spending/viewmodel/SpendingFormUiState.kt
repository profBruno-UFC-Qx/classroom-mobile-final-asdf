package com.cofifinance.mobile.ui.spending.viewmodel

data class SpendingFormUiState(
    val isLoading: Boolean = false,
    val name: String = "",
    val category: String = "",
    val price: String = "",
    val observation: String = "",
    val spentAt: String = "",
    val nameError: String? = null,
    val categoryError: String? = null,
    val priceError: String? = null,
    val isSubmitting: Boolean = false,
    val formError: String? = null,
)
