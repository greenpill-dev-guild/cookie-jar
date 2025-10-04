import { ANVIL_ACCOUNTS, SELECTORS } from './utils/constants';
import { expect, test } from './utils/wallet-utils';

test.describe('🍪 Complete Cookie Jar Workflow E2E', () => {
  test('End-to-end jar lifecycle - create, configure, fund, withdraw', async ({
    page,
    wallet,
  }) => {
    console.log('🚀 Starting complete jar lifecycle test...');

    // 1️⃣ CREATE JAR
    console.log('🏗️ Step 1: Creating jar as admin...');
    await wallet.connectWallet(0); // Connect as Deployer (admin)

    await page.goto('/create');

    // Fill jar creation form
    await page.fill(SELECTORS.forms.jarName, 'Complete Lifecycle Test Jar');
    await page.fill(
      SELECTORS.forms.jarDescription,
      'End-to-end test for complete jar lifecycle'
    );

    // Select ETH currency
    const currencySelect = page.locator(SELECTORS.forms.currency).first();
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption({ label: 'ETH' });
    }

    await page.click(SELECTORS.buttons.next);

    // Configure withdrawal settings
    await page.click('text=Fixed Amount');
    await page.fill('input:below(:text("Amount"))', '0.1');
    await page.fill('input:below(:text("Interval"))', '1'); // 1 day for testing
    await page.click(SELECTORS.buttons.next);

    // Handle access control (skip for v1, configure for v2)
    if (await page.isVisible('text=Access Control')) {
      await page.click(SELECTORS.access.allowlist);
      await page.click(SELECTORS.buttons.next);
    }

    // Create jar
    await page.click(SELECTORS.buttons.primary);
    await wallet.signTransaction();

    await expect(page.locator(SELECTORS.status.success)).toBeVisible({
      timeout: 30000,
    });
    await page.waitForURL(/\/jar\/0x[a-fA-F0-9]{40}/, { timeout: 30000 });

    const jarAddress = page.url().split('/jar/')[1];
    console.log(`✅ Jar created at address: ${jarAddress}`);

    // 2️⃣ CONFIGURE JAR (Add users to allowlist)
    console.log('👥 Step 2: Configuring jar allowlist...');
    await page.click(SELECTORS.tabs.admin);

    // Add Cookie Monster to allowlist
    const allowlistSection = page.locator('text=Allowlist').locator('..');
    const addInput = allowlistSection.locator(
      'input[placeholder*="0x"], input:below(:text("Add"))'
    );

    await addInput.fill(ANVIL_ACCOUNTS[1].address); // Cookie Monster
    await allowlistSection.locator(SELECTORS.buttons.add).click();
    await wallet.signTransaction();

    await expect(page.locator(SELECTORS.status.success)).toBeVisible();
    console.log('✅ Cookie Monster added to allowlist');

    // Add Cookie Fan to allowlist
    await addInput.fill(ANVIL_ACCOUNTS[2].address); // Cookie Fan
    await allowlistSection.locator(SELECTORS.buttons.add).click();
    await wallet.signTransaction();

    await expect(page.locator(SELECTORS.status.success)).toBeVisible();
    console.log('✅ Cookie Fan added to allowlist');

    // 3️⃣ FUND JAR
    console.log('💰 Step 3: Funding jar...');
    await page.click(SELECTORS.tabs.deposit);

    // Get initial balance
    const balanceElement = page.locator(SELECTORS.cards.jarBalance).first();
    const initialBalance = await balanceElement.textContent();
    console.log('📊 Initial balance:', initialBalance);

    // Deposit funds
    await page.fill(SELECTORS.forms.amount, '2.0');
    await page.click(SELECTORS.buttons.deposit);
    await wallet.signTransaction();

    await expect(page.locator(SELECTORS.status.success)).toBeVisible();

    // Verify balance increased
    await page.waitForTimeout(3000); // Wait for React Query cache invalidation
    const fundedBalance = await balanceElement.textContent();
    expect(fundedBalance).not.toBe(initialBalance);
    console.log('📊 New balance after funding:', fundedBalance);

    // 4️⃣ SWITCH TO USER & WITHDRAW
    console.log('🔄 Step 4: Switching to allowlisted user...');
    await wallet.switchAccount(1); // Switch to Cookie Monster

    await page.reload(); // Refresh to update connection state
    await page.click(SELECTORS.tabs.withdraw);

    // Verify user can withdraw (should be allowlisted)
    const withdrawButton = page.locator(SELECTORS.buttons.withdraw);
    await expect(withdrawButton).toBeVisible();

    // Fill withdrawal purpose if required
    const purposeField = page.locator(SELECTORS.forms.purpose);
    if (await purposeField.isVisible()) {
      await purposeField.fill('End-to-end test withdrawal for verification');
    }

    // Get balance before withdrawal
    const balanceBeforeWithdraw = await balanceElement.textContent();

    // Perform withdrawal
    await withdrawButton.click();
    await wallet.signTransaction();

    await expect(page.locator(SELECTORS.status.success)).toBeVisible();
    console.log('✅ Withdrawal successful');

    // 5️⃣ VERIFY WITHDRAWAL HISTORY
    console.log('📜 Step 5: Verifying withdrawal history...');

    // Look for withdrawal history section
    const hasHistory = await page
      .locator('text=History, text=Withdrawal')
      .isVisible();
    if (hasHistory) {
      await expect(
        page.locator('text=End-to-end test withdrawal')
      ).toBeVisible();
      console.log('✅ Withdrawal recorded in history');
    }

    // Verify balance decreased
    await page.waitForTimeout(3000);
    const finalBalance = await balanceElement.textContent();
    expect(finalBalance).not.toBe(balanceBeforeWithdraw);
    console.log('📊 Final balance:', finalBalance);

    // 6️⃣ TEST ACCESS CONTROL
    console.log(
      '🔒 Step 6: Testing access control with non-allowlisted user...'
    );
    await wallet.switchAccount(3); // Switch to Test User (not allowlisted)

    await page.reload();
    await page.click(SELECTORS.tabs.withdraw);

    // Should see access denied
    await expect(
      page.locator('text=Not Allowlisted, text=access denied')
    ).toBeVisible();
    console.log('✅ Access control properly enforced');

    console.log('🎉 Complete jar lifecycle test passed!');
  });

  test('NFT-gated jar complete workflow (v2 only)', async ({
    page,
    wallet,
  }) => {
    console.log('🎨 Testing complete NFT-gated jar workflow...');

    // Check if NFT gating is available
    await page.goto('/create');
    const hasNFTOption = await page.isVisible(SELECTORS.access.nftGated);
    test.skip(
      !hasNFTOption,
      'NFT gating not available - requires v2 contracts'
    );

    // Create NFT-gated jar
    await wallet.connectWallet(0); // Admin

    await page.fill(SELECTORS.forms.jarName, 'NFT Lifecycle Test');
    await page.click(SELECTORS.buttons.next);

    await page.click('text=Variable Amount');
    await page.fill('input:below(:text("Maximum"))', '500');
    await page.fill('input:below(:text("Interval"))', '1');
    await page.click(SELECTORS.buttons.next);

    // Configure NFT gating
    await page.click(SELECTORS.access.nftGated);
    await page.fill(
      SELECTORS.nft.addressInput,
      '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    );

    const typeSelect = page.locator(SELECTORS.nft.typeSelect).first();
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('ERC721');
    }

    await page.waitForSelector(SELECTORS.nft.validation, { timeout: 10000 });
    await page.click(SELECTORS.buttons.add);
    await page.click(SELECTORS.buttons.next);

    // Create jar
    await page.click(SELECTORS.buttons.primary);
    await wallet.signTransaction();

    await page.waitForURL(/\/jar\/0x[a-fA-F0-9]{40}/);

    // Fund the NFT jar
    await page.click(SELECTORS.tabs.deposit);
    await page.fill(SELECTORS.forms.amount, '1.0');
    await page.click(SELECTORS.buttons.deposit);
    await wallet.signTransaction();

    // Switch to NFT holder
    await wallet.switchAccount(1); // Cookie Monster (has NFT #0)
    await page.reload();

    // Verify NFT ownership is detected
    await expect(page.locator('text=You own, text=NFT')).toBeVisible();

    // Perform NFT withdrawal
    await page.click(SELECTORS.tabs.withdraw);
    await page.fill(
      SELECTORS.nft.addressInput,
      '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    );
    await page.fill(SELECTORS.nft.tokenIdInput, '0');
    await page.fill(SELECTORS.forms.amount, '0.1');

    if (await page.locator(SELECTORS.forms.purpose).isVisible()) {
      await page.fill(SELECTORS.forms.purpose, 'NFT holder test withdrawal');
    }

    await page.click(SELECTORS.buttons.withdraw);
    await wallet.signTransaction();

    await expect(page.locator(SELECTORS.status.success)).toBeVisible();

    // Test access denial for non-NFT holders
    await wallet.switchAccount(3); // Test User (no NFTs)
    await page.reload();

    await page.click(SELECTORS.tabs.withdraw);
    // Should not be able to withdraw or should see access denied
    const hasWithdrawAccess = await page
      .locator(SELECTORS.buttons.withdraw)
      .isEnabled();
    expect(hasWithdrawAccess).toBe(false);

    console.log('✅ NFT-gated jar workflow test passed!');
  });
});
