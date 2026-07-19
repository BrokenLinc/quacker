import { useDisclosure as chakraUseDisclosure } from '@chakra-ui/react';
import {
  useColorMode,
  useColorModeValue,
} from '../../components/ui/color-mode';
import { toaster } from '../../components/ui/toaster';

export { useColorMode, useColorModeValue };

type DisclosureProps = Parameters<typeof chakraUseDisclosure>[0] & {
  defaultIsOpen?: boolean;
  isOpen?: boolean;
};

export function useDisclosure(props?: DisclosureProps) {
  const disclosure = chakraUseDisclosure({
    ...props,
    defaultOpen: props?.defaultOpen ?? props?.defaultIsOpen,
    open: props?.open ?? props?.isOpen,
  });
  return {
    ...disclosure,
    isOpen: disclosure.open,
  };
}

export type UseDisclosureReturn = ReturnType<typeof useDisclosure>;

type ToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  status?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number | null;
  isClosable?: boolean;
};

const activeToastIds = new Set<string>();

export function useToast() {
  const toast = (options: ToastOptions) => {
    const id = options.id ?? crypto.randomUUID();
    activeToastIds.add(id);
    toaster.create({
      id,
      title: options.title,
      description: options.description,
      type: mapToastType(options.status),
      duration: options.duration ?? undefined,
      closable: options.isClosable,
    });
    return id;
  };

  toast.isActive = (id: string) => activeToastIds.has(id);
  toast.close = (id: string) => {
    toaster.dismiss(id);
    activeToastIds.delete(id);
  };
  toast.closeAll = () => {
    toaster.dismiss();
    activeToastIds.clear();
  };

  return toast;
}

function mapToastType(status?: ToastOptions['status']) {
  switch (status) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    case 'loading':
      return 'loading';
    default:
      return undefined;
  }
}

export function useTheme() {
  const { colorMode } = useColorMode();
  return {
    colors: {} as Record<string, Record<string, string> | string>,
    colorMode,
  };
}
