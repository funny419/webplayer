package com.webplayer

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.webplayer.BuildConfig

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)

        // chrome://inspect 원격 디버깅 (debug 빌드 전용 — 성능 측정용)
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView.settings.apply {
            javaScriptEnabled = true
            allowFileAccess = true
            domStorageEnabled = true   // LocalStorage 지원 (게임 저장 시스템용)
            mediaPlaybackRequiresUserGesture = false
        }

        // 외부 브라우저로 열리지 않도록 WebViewClient 설정
        webView.webViewClient = WebViewClient()

        // 로컬 에셋 로드
        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
