/**
 * Plugin panel types — UI injection points for plugins.
 *
 * Plugins declare panels in their `panels` array. The client-side
 * plugin registry renders them in the appropriate slot locations.
 */

/**
 * Named insertion points in the UI where plugins can inject content.
 */
export type PanelSlot =
  | 'person.detail.tab'
  | 'person.detail.sidebar'
  | 'dashboard.widget'
  | 'tree.overlay'
  | 'navigation.item'
  | 'global.action';

/**
 * A panel definition — metadata for a plugin-provided UI panel.
 */
export interface PanelDefinition {
  /** Which slot to render in */
  slot: PanelSlot;
  /** Display label (tab title, panel header) */
  label: string;
  /** Icon emoji or identifier */
  icon?: string;
  /** Component name — resolved by the client-side plugin loader */
  component: string;
  /** Default props passed to the component */
  props?: Record<string, unknown>;
  /** Sort order within the slot (lower = first) */
  order?: number;
  /** Plugin name — set automatically by the runtime */
  pluginName?: string;
}
