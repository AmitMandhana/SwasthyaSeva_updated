export type LocatorRole = 'button' | 'link' | 'heading' | 'textbox' | 'checkbox' | 'radio' | 'combobox' | 'tab' | 'tabpanel' | 'dialog' | 'alert' | 'navigation' | 'list' | 'listitem' | 'cell' | 'row' | 'img' | 'menuitem' | 'menu' | 'switch' | 'slider' | 'spinbutton' | 'progressbar' | 'status' | 'region' | 'group' | 'option';

export type ElementLocator =
  | { role: LocatorRole; name: string | RegExp; exact?: boolean }
  | { testId: string }
  | { text: string | RegExp };

export type AuthPreset =
  | 'none'
  | 'optional'
  | 'required'
  | 'role:admin'
  | 'role:doctor'
  | 'role:clinic'
  | 'role:clinic_admin'
  | 'role:patient';

export type AppName = 'web' | 'admin' | 'doctor' | 'clinic';

export type ActionType =
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'hover'
  | 'press'
  | 'waitFor'
  | 'clickNewTab'
  | 'jsClick'
  | 'type'
  | 'navigate'
  | 'screenshot'
  | 'comboboxSelect'
  | 'comboboxSelectFirst'
  | 'fillFromSlotDay'
  | 'reactFill'
  | 'reload'
  | 'resolveAndFill'
  | 'uploadFile';

export type AssertionType =
  | 'visible'
  | 'not.visible'
  | 'hidden'
  | 'text'
  | 'value'
  | 'url'
  | 'urlContains'
  | 'navigation'
  | 'count'
  | 'countMin'
  | 'countMax'
  | 'hasClass'
  | 'enabled'
  | 'disabled'
  | 'checked';

export interface TestStep {
  do?: ActionType;
  expect?: AssertionType;
  on?: string;
  to?: string;
  value?: string | number | RegExp;
}

export interface TestFlow {
  id?: string;
  name: string;
  after?: string | string[];
  steps: TestStep[];
}

export interface FlowNode {
  id?: string;
  name: string;
  steps: TestStep[];
  children?: FlowNode[];
}

export interface SeedApi {
  endpoint: string;
  method: 'POST' | 'DELETE';
  body: Record<string, unknown>;
  routeParam: string;
  resolveEntities?: boolean;
}

export interface TestSpec<E extends Record<string, ElementLocator> = Record<string, ElementLocator>> {
  route: string;
  auth: AuthPreset;
  app: AppName;
  title: string;
  elements: E;
  flows: TestFlow[];
  flowTree?: FlowNode;
  seedApi?: SeedApi;
}

export function testSpec<E extends Record<string, ElementLocator>>(spec: TestSpec<E>): TestSpec<E> {
  return spec;
}

export interface ComponentTestSpec<E extends Record<string, ElementLocator> = Record<string, ElementLocator>> {
  parentRoute: string | string[];
  app: AppName;
  title: string;
  elements: E;
  flows: TestFlow[];
}

export function componentTestSpec<E extends Record<string, ElementLocator>>(
  spec: ComponentTestSpec<E>,
): ComponentTestSpec<E> {
  return spec;
}
