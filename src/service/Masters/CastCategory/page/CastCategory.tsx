// page/CastCategory.tsx

import React from 'react';
import { useCastCategory } from '../hook/useCastCategory';
import CastCategoryForm from '../components/CastCategoryForm';

const CastCategory: React.FC = () => {
  const castCategoryProps = useCastCategory();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <CastCategoryForm {...castCategoryProps} />
    </div>
  );
};

export default CastCategory;
