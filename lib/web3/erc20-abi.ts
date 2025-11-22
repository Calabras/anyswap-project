// Minimal ERC20 ABI for symbol/decimals/approve queries
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
]

export default ERC20_ABI
