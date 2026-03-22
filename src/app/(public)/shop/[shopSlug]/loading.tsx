/**
 * Shop Landing Page Loading State
 */

import { GrowthLoadingState } from '../../../../components/public/growth/GrowthLoadingState.js';

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <GrowthLoadingState type="shop" />
      </div>
    </div>
  );
}
