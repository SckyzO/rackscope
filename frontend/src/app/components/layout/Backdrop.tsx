export const Backdrop = ({
  onClick,
  zIndex = 30,
  blur = true,
}: {
  onClick?: () => void;
  zIndex?: number;
  blur?: boolean;
}) => (
  <div
    className={`fixed inset-0 bg-black/20 ${blur ? 'backdrop-blur-[1px]' : ''}`}
    style={{ zIndex }}
    onClick={onClick}
  />
);
