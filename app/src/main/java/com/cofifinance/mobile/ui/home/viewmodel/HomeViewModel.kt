package com.cofifinance.mobile.ui.home.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cofifinance.mobile.data.repository.SpendingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repo: SpendingRepository,
) : ViewModel() {

    private val _ui = MutableStateFlow(HomeUiState())
    val ui: StateFlow<HomeUiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            repo.spendings.collect { list ->
                _ui.update { it.copy(spendings = list) }
            }
        }
        viewModelScope.launch {
            runCatching { repo.sync() }
                .onFailure { _ui.update { it.copy(isLoading = false, error = "Could not sync spendings") } }
                .onSuccess { _ui.update { it.copy(isLoading = false) } }
        }
    }
}
