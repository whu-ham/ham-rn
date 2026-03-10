package com.nowcent.ham.rndebug.module

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.nowcent.ham.rn.nativemodule.NativeCasModuleSpec

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/1/21 01:29
 */
var casCookie: String = ""

class RNCasModule(reactContext: ReactApplicationContext) :
    NativeCasModuleSpec(reactContext) {

    override fun requestCasCookie(): String {
        Log.i("RNCasModule", "requestCasCookie: cookie=$casCookie")
        return casCookie
    }
}
