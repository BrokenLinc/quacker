import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor as LibKeyboardSensor,
  MouseSensor as LibMouseSensor,
  PointerSensor as LibPointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import _ from 'lodash';
import React from 'react';

export const SortableListContext = React.createContext<{
  items: Sortable<any>[];
}>({
  items: [],
});

export interface Sortable<T> {
  id: number | string;
  data: T;
}

export const SortableList = function <T>({
  items,
  children,
  onDragEnd,
  onMove,
}: {
  items: Sortable<T>[];
  children: React.ReactNode;
  onDragEnd?: (event: DragEndEvent) => any;
  onMove?: (activeIndex: number, overIndex: number) => any;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    onDragEnd?.(e);
    const activeIndex = _.findIndex(items, (o) => o.id === e.active.id);
    const overIndex = _.findIndex(items, (o) => o.id === e.over?.id);
    onMove?.(activeIndex, overIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <SortableListContext.Provider value={{ items }}>
          {children}
        </SortableListContext.Provider>
      </SortableContext>
    </DndContext>
  );
};

type UseSortableParameter = Parameters<typeof useSortable>[0];

export const SortableListItem: React.FC<
  {
    children: React.FC<
      React.HTMLAttributes<HTMLDivElement> & {
        ref: (node: HTMLElement | null) => void;
      }
    >;
  } & UseSortableParameter
> = ({ children, ...params }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable(params);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return children({
    ref: setNodeRef,
    ...attributes,
    ...listeners,
    style,
  });
};

export type SortableListItemRenderer<T> = (
  props: React.HTMLAttributes<HTMLDivElement> & {
    ref: (node: HTMLElement | null) => void;
  },
  item: Sortable<T>,
  index: number
) => React.ReactElement;

export const SortableListItemRepeater: React.FC<{
  children: SortableListItemRenderer<any>;
}> = ({ children }) => {
  const { items } = React.useContext(SortableListContext);
  return (
    <React.Fragment>
      {items.map((item, index) => {
        return (
          <SortableListItem key={item.id} id={item.id}>
            {(props) => children(props, item, index)}
          </SortableListItem>
        );
      })}
    </React.Fragment>
  );
};

// Filters out elements with 'data-no-dnd' attribute
function shouldHandleEvent(element: HTMLElement | null) {
  let cur = element;

  while (cur) {
    // exclude elements with data-no-dnd attribute
    if (cur.dataset && cur.dataset.noDnd) {
      return false;
    }
    // exclude input and textarea elements
    if (['BUTTON', 'INPUT', 'TEXTAREA'].includes(cur.tagName)) {
      return false;
    }
    cur = cur.parentElement;
  }

  return true;
}

export class MouseSensor extends LibMouseSensor {
  static activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: ({ nativeEvent: event }: React.MouseEvent) => {
        return shouldHandleEvent(event.target as HTMLElement);
      },
    },
  ];
}

export class KeyboardSensor extends LibKeyboardSensor {
  static activators = [
    {
      eventName: 'onKeyDown' as const,
      handler: ({ nativeEvent: event }: React.KeyboardEvent<Element>) => {
        return shouldHandleEvent(event.target as HTMLElement);
      },
    },
  ];
}

export class PointerSensor extends LibPointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: React.PointerEvent) => {
        return shouldHandleEvent(event.target as HTMLElement);
      },
    },
  ];
}
