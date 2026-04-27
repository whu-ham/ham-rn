//
//  HomeView.swift
//  ham-rn
//
//  Created by orangeboy on 2026/4/27.
//

import SwiftUI

/// Represents a React Native demo component entry.
struct RNDemoItem: Identifiable {
    let id = UUID()
    let title: String
    let moduleName: String
}

/// The main home view that lists all available RN demo components.
/// Mirrors the Android HomeActivity with Jetpack Compose navigation.
struct HomeView: View {
    private let demoItems: [RNDemoItem] = [
        RNDemoItem(title: "CasMobileLoginView", moduleName: "RNCasMobileLogin"),
        RNDemoItem(title: "RNFetchCourseView", moduleName: "RNFetchCourseView"),
        RNDemoItem(title: "RNFetchScoreView", moduleName: "RNFetchScoreView"),
        RNDemoItem(title: "RNScoreCalcView", moduleName: "RNScoreCalcView"),
        RNDemoItem(title: "RNCommon", moduleName: "RNCommon"),
    ]

    var body: some View {
        NavigationStack {
            List(demoItems) { item in
                NavigationLink(destination: RNDetailView(item: item)) {
                    Text(item.title)
                        .font(.body)
                        .foregroundColor(.accentColor)
                        .padding(.vertical, 8)
                }
            }
            .navigationTitle("HAM-RN Demo")
        }
    }
}

/// A detail view that displays a React Native module.
struct RNDetailView: View {
    let item: RNDemoItem

    var body: some View {
        RNContainerView(moduleName: item.moduleName)
            .navigationTitle(item.title)
            .navigationBarTitleDisplayMode(.inline)
            .ignoresSafeArea(.container, edges: .bottom)
    }
}

#Preview {
    HomeView()
}
