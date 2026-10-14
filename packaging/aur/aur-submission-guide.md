# Arch User Repository (AUR) Submission Guide for CIBO Calculator

This guide provides instructions for publishing and maintaining **cibo-calculator** on the [Arch User Repository (AUR)](https://aur.archlinux.org/).

---

## Prerequisites

1. **AUR Account**: Register an account at [https://aur.archlinux.org/register/](https://aur.archlinux.org/register/).
2. **SSH Key**: Add your SSH public key (`~/.ssh/id_ed25519.pub` or `~/.ssh/id_rsa.pub`) to your AUR profile settings at [https://aur.archlinux.org/account/](https://aur.archlinux.org/account/).
3. **Arch Build Tools**:
   ```bash
   sudo pacman -S base-devel git
   ```

---

## Submission Steps

### Step 1: Clone the AUR Repository
Clone the package namespace using your AUR username:
```bash
git clone ssh://aur@aur.archlinux.org/cibo-calculator.git
cd cibo-calculator
```
*(If this is the initial submission, git will notify you that you are cloning an empty repository, which is normal).*

### Step 2: Copy Package Files
Copy the prepared files from `packaging/aur/` into the cloned directory:
```bash
cp /path/to/cibo-calculator/packaging/aur/PKGBUILD .
cp /path/to/cibo-calculator/packaging/aur/.SRCINFO .
cp /path/to/cibo-calculator/packaging/aur/cibo-calculator.sh .
cp /path/to/cibo-calculator/packaging/aur/cibo-calculator.desktop .
```

### Step 3: Test Build Locally
Run `makepkg` to test building and packaging locally:
```bash
# Check PKGBUILD syntax and build
makepkg -sfc

# Generate or update .SRCINFO
makepkg --printsrcinfo > .SRCINFO
```

### Step 4: Commit and Push
```bash
git add PKGBUILD .SRCINFO cibo-calculator.sh cibo-calculator.desktop
git commit -m "Initial release of cibo-calculator v1.3.3"
git push origin master
```

### Step 5: Verify Package on AUR
Visit [https://aur.archlinux.org/packages/cibo-calculator](https://aur.archlinux.org/packages/cibo-calculator) to view the live package page.
Users across Arch Linux, EndeavourOS, and Manjaro will now be able to install it via any AUR helper:
```bash
yay -S cibo-calculator
# or
paru -S cibo-calculator
```
