const { ethers } = require("hardhat");

async function main() {
  // === 1. THIẾT LẬP ===
  // Thay thế bằng địa chỉ contract MyToken đã deploy của bạn
  const tokenAddress = " 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  
  // Lấy các tài khoản từ Hardhat node
  // owner = Account #0 (tài khoản deploy contract)
  // spender = Account #1
  const [owner, spender] = await ethers.getSigners();

  // Số lượng token để giao dịch (ví dụ: 100 token)
  const amount = ethers.parseUnits("100", 18); // 100 * 10^18

  // Kết nối với contract
  const Token = await ethers.getContractFactory("MyToken");
  const token = Token.attach(tokenAddress);

  console.log(`Kết nối với contract tại: ${tokenAddress}`);
  console.log(`Owner (Chủ): ${owner.address}`);
  console.log(`Spender (Người chi tiêu): ${spender.address}`);

  // === 2. OWNER ỦY QUYỀN (APPROVE) ===
  console.log(`\nBước 1: Owner đang ủy quyền ${ethers.formatUnits(amount, 18)} token cho Spender...`);
  
  // Owner (Account #0) gọi hàm approve
  const tx1 = await token.connect(owner).approve(spender.address, amount);
  await tx1.wait(); // Chờ giao dịch hoàn tất
  
  console.log("✅ Ủy quyền (Approve) thành công.");

  // Kiểm tra số tiền ủy quyền
  const allowance = await token.allowance(owner.address, spender.address);
  console.log(`   -> Số tiền ủy quyền hiện tại: ${ethers.formatUnits(allowance, 18)} MTK`);

  // === 3. SPENDER THỰC HIỆN (TRANSFERFROM) ===
  console.log(`\nBước 2: Spender đang gọi transferFrom để lấy 100 token từ Owner...`);

  // Spender (Account #1) gọi hàm transferFrom
  // Lấy 100 token từ 'owner.address' và gửi về cho chính 'spender.address'
  const tx2 = await token.connect(spender).transferFrom(owner.address, spender.address, amount);
  await tx2.wait(); // Chờ giao dịch hoàn tất
  
  console.log("✅ Giao dịch transferFrom thành công.");

  // === 4. KIỂM TRA KẾT QUẢ ===
  const ownerBalance = await token.balanceOf(owner.address);
  const spenderBalance = await token.balanceOf(spender.address);

  console.log("\n--- Kết Quả Cuối Cùng ---");
  console.log(`Số dư của Owner: ${ethers.formatUnits(ownerBalance, 18)} MTK`);
  console.log(`Số dư của Spender: ${ethers.formatUnits(spenderBalance, 18)} MTK`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});