//
//  RNContainerView.swift
//  ham-rn
//
//  Created by orangeboy on 2026/4/27.
//

import SwiftUI

/// A SwiftUI wrapper for React Native RCTRootView.
/// Similar to the Android RNContainer composable, this loads a React Native module by name.
struct RNContainerView: UIViewControllerRepresentable {
    let moduleName: String

    func makeUIViewController(context: Context) -> RNContainerViewController {
        return RNContainerViewController(moduleName: moduleName)
    }

    func updateUIViewController(_ uiViewController: RNContainerViewController, context: Context) {}
}

/// A UIViewController that hosts an RCTRootView.
class RNContainerViewController: UIViewController {
    private let moduleName: String

    init(moduleName: String) {
        self.moduleName = moduleName
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            return
        }

        let rootFactory = appDelegate.rootViewFactory()
        let rootView = rootFactory.view(
            withModuleName: moduleName,
            initialProperties: nil as [String: Any]?
        )

        rootView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(rootView)

        NSLayoutConstraint.activate([
            rootView.topAnchor.constraint(equalTo: view.topAnchor),
            rootView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            rootView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            rootView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }
}
