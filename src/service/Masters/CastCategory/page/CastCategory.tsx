// page/CastCategory.tsx

import React from 'react';
import { useCastCategory } from '../hook/useCastCategory';
import CastCategoryForm from '../components/CastCategoryForm';

const CastCategory: React.FC = () => {
  const castCategoryProps = useCastCategory();

  return (
    <div className="cast-category-page h-screen bg-slate-50 overflow-hidden">
      <CastCategoryForm {...castCategoryProps} />

      <style>{`
        html.dark .cast-category-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default CastCategory;
