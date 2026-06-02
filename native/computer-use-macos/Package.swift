// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "KorcaComputerUseMacOS",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "KorcaComputerUseMacOSCore",
            targets: ["KorcaComputerUseMacOSCore"]
        ),
        .executable(
            name: "korca-computer-use-macos",
            targets: ["KorcaComputerUseMacOS"]
        )
    ],
    targets: [
        .target(
            name: "KorcaComputerUseMacOSCore",
            path: "Sources/KorcaComputerUseMacOSCore"
        ),
        .executableTarget(
            name: "KorcaComputerUseMacOS",
            dependencies: ["KorcaComputerUseMacOSCore"],
            path: "Sources/KorcaComputerUseMacOS"
        ),
        .testTarget(
            name: "KorcaComputerUseMacOSTests",
            dependencies: ["KorcaComputerUseMacOSCore"],
            path: "Tests/KorcaComputerUseMacOSTests"
        )
    ]
)
