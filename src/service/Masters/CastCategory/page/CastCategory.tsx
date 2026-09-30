// page/CastCategory.tsx

import React from 'react';
import { useCastCategory } from '../hook/useCastCategory';
import CastCategoryForm from '../components/CastCategoryForm';

const CastCategory: React.FC = () => {
  const castCategoryProps = useCastCategory();

  return <CastCategoryForm {...castCategoryProps} />;
};

export default CastCategory;
