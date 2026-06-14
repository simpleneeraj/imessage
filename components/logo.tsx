import { tv } from 'tailwind-variants';

const style = tv({
  base: 'font-heading',
  variants: {
    size: {
      sm: 'text-base',
      md: 'text-xl',
      lg: 'text-2xl',
    },
  },
});

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  parts: {
    text: string;
    className: string;
  }[];
};
export default function Logo({ size = 'md', parts }: LogoProps) {
  return (
    <p className={style({ size, className: 'font-alice' })}>
      {parts.map((part) => (
        <span key={part.text} className={part.className}>
          {part.text}
        </span>
      ))}
    </p>
  );
}
