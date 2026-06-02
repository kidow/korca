cask "korca@rc" do
  arch arm: "arm64", intel: "x64"

  version "1.4.36-rc.3"
  sha256 arm:   "563b6b14323fc9d5489299c82442d514bc12cabffc9d06d3964ed572af4b3955",
         intel: "457088c7021f07de1a419197f7b2bd00092741ad4727d4fef3d86af38a6831e7"

  url "https://github.com/stablyai/korca/releases/download/v#{version}/korca-macos-#{arch}.dmg",
      verified: "github.com/stablyai/korca/"
  name "Korca RC"
  desc "IDE for orchestrating AI coding agents across terminals and worktrees"
  homepage "https://onkorca.dev/"

  livecheck do
    url "https://github.com/stablyai/korca"
    regex(/^v?(\d+(?:\.\d+)+-rc\.\d+)$/i)
    strategy :github_releases do |json, regex|
      json.map do |release|
        next if release["draft"]
        next unless release["prerelease"]

        match = release["tag_name"]&.match(regex)
        next if match.blank?

        match[1]
      end
    end
  end

  # Why: RC installs should follow Korca's prerelease-aware updater instead of
  # waiting for Homebrew metadata churn between frequent release candidates.
  auto_updates true
  conflicts_with cask: "korca"
  depends_on macos: :big_sur

  app "Korca.app"

  # Why: Korca writes user data under ~/.korca (worktrees, agent state) and
  # Electron's standard userData directories. Zap removes everything the app
  # creates during normal use so `brew uninstall --zap` is a clean slate.
  zap trash: [
    "~/.korca",
    "~/Library/Application Support/Korca",
    "~/Library/Caches/com.stablyai.korca",
    "~/Library/Caches/com.stablyai.korca.ShipIt",
    "~/Library/HTTPStorages/com.stablyai.korca",
    "~/Library/Preferences/com.stablyai.korca.plist",
    "~/Library/Saved Application State/com.stablyai.korca.savedState",
  ]
end
