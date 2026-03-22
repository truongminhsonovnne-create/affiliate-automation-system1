# TikTok Shop Promotion Compatibility Principles

## Core Principles

### 1. Explicit Partial Support

**DO:**
- Clearly state which promotion types map cleanly
- Explicitly flag partial mappings
- Document workarounds for gaps

**DON'T:**
- Pretend full compatibility when it doesn't exist
- Hide mapping issues
- Force everything into generic model

### 2. Compatibility Before Implementation

**DO:**
- Map promotion semantics first
- Identify gaps before coding
- Build compatibility layer before production

**DON'T:**
- Copy Shopee rules blindly
- Assume TikTok promotions work like Shopee
- Skip compatibility analysis

### 3. Semantic Clarity Over Generic Modeling

**DO:**
- Preserve TikTok-specific semantics
- Document what doesn't map
- Create custom handlers where needed

**DON'T:**
- Over-genericize to the point of meaninglessness
- Lose platform-specific nuances
- Force fit where none exists

## Promotion Type Compatibility

### Fully Compatible

| TikTok Type | Commerce Equivalent | Notes |
|-------------|---------------------|-------|
| Percentage Discount | discount | Direct mapping |
| Fixed Amount | discount | Direct mapping |
| Free Shipping | shipping | Direct mapping |

### Partially Compatible

| TikTok Type | Commerce Equivalent | Gap |
|-------------|---------------------|-----|
| Voucher | coupon | Code handling differs |
| Flash Sale | discount | Time constraints differ |
| Bundle | discount | Complex eligibility |

### Not Compatible

| TikTok Type | Reason | Workaround |
|-------------|--------|-------------|
| BOGO | Complex logic | Use fixed discount with quantity rules |
| User Segment | Not in contracts | Use eligibility conditions |
| VIP Tiers | Different system | Map to membership levels |

## Scope Mapping

TikTok Shop scopes don't always map 1:1 to commerce contracts:

- **user_segment** → Use eligibility conditions
- **region** → Implement separately
- **custom** → Requires custom handler

## Decision Framework

### When to Map Cleanly

- Promotion type is standard (discount, fixed)
- Scope is simple (global, product)
- Constraints are supported (min_spend, product_id)

### When to Use Workarounds

- Complex promotion types (BOGO)
- TikTok-specific scopes
- Platform-only features

### When to Flag Unsupported

- No commerce equivalent exists
- Gap is too large
- Requires significant custom code

## Anti-Patterns

### ❌ "Make It Fit"
Forcing TikTok promotions into Shopee model regardless of semantics.

### ❌ "Ignore Differences"
Treating TikTok promotions identically to Shopee promotions.

### ❌ "Generic Everything"
Over-abstracting to the point of losing meaning.

### ❌ "Copy Shopee"
Blatantly copying Shopee rules without considering TikTok nuances.
