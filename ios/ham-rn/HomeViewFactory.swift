//
//  HomeViewFactory.swift
//  ham-rn
//
//  Created by orangeboy on 2026/4/27.
//

import SwiftUI

/// A factory class exposed to Objective-C that creates the SwiftUI HomeView
/// wrapped in a UIHostingController.
@objc class HomeViewFactory: NSObject {
    @objc static func createHomeViewController() -> UIViewController {
        return UIHostingController(rootView: HomeView())
    }
}
