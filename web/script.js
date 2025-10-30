// --- Biến toàn cục ---
let provider, signer, token, account, decimals;

// --- Lấy các phần tử DOM ---
const connectButton = document.getElementById("connectButton");
const accountP = document.getElementById("account");
const loadTokenBtn = document.getElementById("loadToken");
const tokenAddressInput = document.getElementById("tokenAddress");
const crudSection = document.getElementById("crud-section");
const approveBtn = document.getElementById("approveBtn");
const revokeBtn = document.getElementById("revokeBtn");
const spenderTable = document.querySelector("#spenderTable tbody");
const historySection = document.getElementById("history-section");
const historyTable = document.querySelector("#historyTable tbody");

// --- ABI (ERC20 Tiêu chuẩn) ---
// (Bạn đã có đủ các hàm và sự kiện cần thiết trong đây)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// --- 1. Kết nối MetaMask ---
connectButton.onclick = async () => {
  if (!window.ethereum) return alert("Please install MetaMask!");
  
  // Ethers v6 (cách bạn làm là đúng)
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  account = await signer.getAddress();
  accountP.textContent = "Connected: " + account;
};

// --- 2. Tải Token (ĐÃ SỬA LỖI) ---
loadTokenBtn.onclick = async () => {
  const address = tokenAddressInput.value.trim();
  if (!ethers.isAddress(address)) return alert("Invalid token address");
  
  token = new ethers.Contract(address, ERC20_ABI, signer);

  try {
    // ✅ SỬA LỖI: Lấy và lưu trữ 'decimals'
    const tokenName = await token.name();
    // Lấy số thập phân từ contract và lưu vào biến toàn cục
    decimals = await token.decimals(); 
    
    console.log(`✅ Token loaded: ${tokenName} (Decimals: ${decimals})`);

    // Hiển thị các khu vực bị ẩn
    crudSection.style.display = "block";
    historySection.style.display = "block"; // ✅ Hiển thị lịch sử

    // Tải bảng spender và lịch sử
    refreshTable();
    loadHistory(); // ✅ Gọi hàm tải lịch sử
    
  } catch (err) {
    console.error(err);
    alert("Failed to load token. Is this a valid ERC20 contract?");
  }
};

// --- 3. Làm mới Bảng Spender (ĐÃ SỬA LỖI) ---
async function refreshTable() {
  if (!decimals) return; // Chờ đến khi 'decimals' được tải
  
  spenderTable.innerHTML = "";
  const spenders = JSON.parse(localStorage.getItem("spenders") || "[]");
  
  for (const spender of spenders) {
    const allowance = await token.allowance(account, spender);
    const tr = document.createElement("tr");
    // ✅ SỬA LỖI: Dùng biến 'decimals' thay vì hardcode 18
    tr.innerHTML = `<td>${spender}</td><td>${ethers.formatUnits(allowance, decimals)}</td>`;
    spenderTable.appendChild(tr);
  }
}

// --- 4. Nút Approve (ĐÃ SỬA LỖI) ---
approveBtn.onclick = async () => {
  if (!decimals) return alert("Token not loaded yet!");

  const spender = document.getElementById("spenderAddress").value.trim();
  const amount = document.getElementById("amount").value;
  if (!ethers.isAddress(spender)) return alert("Invalid spender");

  // Lưu spender vào localStorage
  const spenders = JSON.parse(localStorage.getItem("spenders") || "[]");
  if (!spenders.includes(spender)) spenders.push(spender);
  localStorage.setItem("spenders", JSON.stringify(spenders));

  // ✅ SỬA LỖI: Dùng biến 'decimals'
  const tx = await token.approve(spender, ethers.parseUnits(amount, decimals));
  await tx.wait();
  
  alert("Approved successfully!");
  refreshTable(); // Cập nhật bảng spender
  loadHistory();  // ✅ Cập nhật bảng lịch sử
};

// --- 5. Nút Revoke ---
revokeBtn.onclick = async () => {
  const spender = document.getElementById("spenderAddress").value.trim();
  if (!ethers.isAddress(spender)) return alert("Invalid spender");
  
  const tx = await token.approve(spender, 0); // Approve 0
  await tx.wait();
  
  alert("Revoked successfully!");
  refreshTable(); // Cập nhật bảng spender
  loadHistory();  // ✅ Cập nhật bảng lịch sử
};

// --- 6. Tải Lịch sử (ĐÃ SỬA LỖI và CẢI TIẾN) ---
async function loadHistory() {
  if (!decimals) return; // Chờ 'decimals' được tải

  historyTable.innerHTML = "";
  const currentBlock = await provider.getBlockNumber();
  
  // Lọc 2000 block gần nhất (bạn có thể tăng/giảm)
  const fromBlock = Math.max(0, currentBlock - 2000);

  // Lấy các sự kiện
  const transferEvents = await token.queryFilter("Transfer", fromBlock, currentBlock);
  const approvalEvents = await token.queryFilter("Approval", fromBlock, currentBlock);

  const relatedEvents = [];

  // Lọc sự kiện Transfer liên quan đến user
  for (const e of transferEvents) {
    const { from, to, value } = e.args;
    if (from === account || to === account) {
      relatedEvents.push({
        block: e.blockNumber, // Thêm blockNumber để sắp xếp
        type: "Transfer",
        from,
        to,
        amount: ethers.formatUnits(value, decimals), // ✅ SỬA LỖI
        hash: e.transactionHash
      });
    }
  }

  // Lọc sự kiện Approval liên quan đến user
  for (const e of approvalEvents) {
    const { owner, spender, value } = e.args;
    if (owner === account) { // Chỉ hiển thị sự kiện MÌNH (user) là owner
      relatedEvents.push({
        block: e.blockNumber, // Thêm blockNumber để sắp xếp
        type: "Approval",
        from: owner,
        to: spender,
        amount: ethers.formatUnits(value, decimals), // ✅ SỬA LỖI
        hash: e.transactionHash
      });
    }
  }

  // ✅ Sắp xếp tất cả sự kiện theo block (mới nhất lên đầu)
  relatedEvents.sort((a, b) => b.block - a.block);

  // Hiển thị ra bảng
  for (const ev of relatedEvents) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ev.type}</td>
      <td>${ev.from}</td>
      <td>${ev.to}</td>
      <td>${ev.amount}</td>
      <td><a href="https://etherscan.io/tx/${ev.hash}" target="_blank">${ev.hash.slice(0,10)}...</a></td>
    `;
    historyTable.appendChild(tr);
  }

  if (relatedEvents.length === 0) {
    historyTable.innerHTML = `<tr><td colspan="5">No recent activity found</td></tr>`;
  }
}