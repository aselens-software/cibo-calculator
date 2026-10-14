# Flathub Submission Guide for CIBO Calculator

This guide provides step-by-step instructions for submitting **CIBO Calculator** (`com.aselens.CiboCalculator`) to [Flathub](https://flathub.org).

---

## Prerequisites

1. **GitHub Account**: A GitHub account with access to open pull requests.
2. **Local Flatpak Tools (Optional for local testing)**:
   ```bash
   sudo apt install flatpak flatpak-builder
   flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
   flatpak install -y flathub org.freedesktop.Platform//24.08 org.freedesktop.Sdk//24.08 org.electronjs.Electron2.BaseApp//24.08
   ```

---

## Submission Steps

### Step 1: Fork the Flathub Repository
1. Navigate to [https://github.com/flathub/flathub](https://github.com/flathub/flathub).
2. Click **Fork** to create a personal fork of the repository.
3. Clone your fork locally:
   ```bash
   git clone git@github.com:<your-username>/flathub.git
   cd flathub
   ```

### Step 2: Create a Feature Branch
Create a new branch named after the application ID:
```bash
git checkout -b add-com.aselens.CiboCalculator
```

### Step 3: Add Manifest and App Data
Copy the files from `packaging/flatpak/` to the root of your `flathub` repository branch:
- `com.aselens.CiboCalculator.yml`
- `com.aselens.CiboCalculator.metainfo.xml`
- `com.aselens.CiboCalculator.desktop`

### Step 4: Validate with Linter & Build Locally
Run the official Flathub linter to ensure everything adheres to community guidelines:
```bash
# Run Flathub linter
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.aselens.CiboCalculator.yml

# Test build
flatpak-builder --force-clean --user --install-deps-from=flathub --repo=repo build-dir com.aselens.CiboCalculator.yml
```

### Step 5: Commit and Push
```bash
git add com.aselens.CiboCalculator.yml com.aselens.CiboCalculator.metainfo.xml com.aselens.CiboCalculator.desktop
git commit -m "Add com.aselens.CiboCalculator"
git push origin add-com.aselens.CiboCalculator
```

### Step 6: Open Pull Request
1. Go to [https://github.com/flathub/flathub](https://github.com/flathub/flathub).
2. GitHub will prompt: *"add-com.aselens.CiboCalculator had recent pushes"*. Click **Compare & pull request**.
3. Fill in the template checklist confirming compliance with:
   - Application ID naming standard (`com.aselens.CiboCalculator`)
   - Open source license (MIT)
   - AppStream metainfo validation
4. Submit the Pull Request!
5. The Flathub build bot (`@flathubbot`) will automatically build and test the package on x86_64 and aarch64 architectures.
6. Once reviewers approve and merge the PR, Flathub will automatically create the official repository `https://github.com/flathub/com.aselens.CiboCalculator`, trigger the release build, and publish it to the Flathub store.
