package com.cofifinance.mobile.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class ApiEnvelope<T>(val data: T)
