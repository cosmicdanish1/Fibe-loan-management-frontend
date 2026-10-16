import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Show the little lock icon on the left (used where the surrounding form already has icons). */
  withIcon?: boolean;
};

/**
 * Password box with a show / hide eye, so people can check what they typed.
 * Same look as the login form's password field; use it for every password input.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, Props>(({ withIcon, className, ...rest }, ref) => {
  const [reveal, setReveal] = useState(false);
  return (
    <div className={`aw-input-wrap ${withIcon ? 'has-icon' : ''} has-action`}>
      {withIcon && <Lock size={14} />}
      <input ref={ref} className={className ?? 'aw-input'} type={reveal ? 'text' : 'password'} {...rest} />
      <button type="button" className="aw-input-action" tabIndex={-1} onClick={() => setReveal((r) => !r)}
        aria-label={reveal ? 'Hide password' : 'Show password'} data-tip={reveal ? 'Hide password' : 'Show password'} data-tip-pos="bottom-end">
        {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
