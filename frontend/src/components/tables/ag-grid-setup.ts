import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale"
import {
  AllCommunityModule,
  ModuleRegistry,
  provideGlobalGridOptions,
} from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])
provideGlobalGridOptions({ localeText: AG_GRID_LOCALE_CN })
