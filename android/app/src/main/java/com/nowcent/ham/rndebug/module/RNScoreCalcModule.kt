package com.nowcent.ham.rndebug.module

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.nowcent.ham.rn.nativemodule.NativeScoreCalcModuleSpec

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/1/21 01:38
 */
class RNScoreCalcModule(reactContext: ReactApplicationContext) :
    NativeScoreCalcModuleSpec(reactContext) {

    override fun getCurrentCalc(): String {
        Log.i("RNScoreCalcModule", "getCurrentCalc")
        return ""
    }

    override fun selectCalc(item: ReadableMap): Boolean {
        Log.i("RNScoreCalcModule", "selectCalc: item=$item")
        return true
    }

    override fun openDetail(item: ReadableMap) {
        Log.i("RNScoreCalcModule", "openDetail: item=$item")
    }

    override fun testItem(item: ReadableMap): Boolean {
        Log.i("RNScoreCalcModule", "testItem: item=$item")
        return true
    }
}
