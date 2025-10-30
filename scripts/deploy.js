const { ethers } = require("hardhat");

async function main() {
  // Ethers v6: không còn ethers.utils
  const initialSupply = ethers.parseUnits("1000", 18);

  const Token = await ethers.getContractFactory("MyToken");
  const token = await Token.deploy(initialSupply);

  // Ethers v6: chờ triển khai hoàn tất
  await token.waitForDeployment();

  console.log("✅ Token deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error("❌ Error deploying:", error);
  process.exitCode = 1;
});

