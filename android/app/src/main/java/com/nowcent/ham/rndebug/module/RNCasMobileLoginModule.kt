package com.nowcent.ham.rndebug.module

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.nowcent.ham.rn.nativemodule.NativeCasMobileLoginModuleSpec

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/1/21 01:28
 */
class RNCasMobileLoginModule(reactContext: ReactApplicationContext) :
    NativeCasMobileLoginModuleSpec(reactContext) {

    override fun onRequestSuccess(studentId: String, password: String, cookie: String) {
        casCookie = cookie
        Log.i(
            "RNCasMobileLoginModule",
            "onRequestSuccess, studentId=$studentId, password=$password, cookie=$cookie"
        )
    }
}
