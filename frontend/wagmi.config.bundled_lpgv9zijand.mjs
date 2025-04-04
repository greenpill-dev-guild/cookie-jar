// wagmi.config.ts
import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";
import { foundry } from "@wagmi/cli/plugins";
var wagmi_config_default = defineConfig({
  out: "src/generated.ts",
  contracts: [],
  plugins: [
    foundry({
      project: "../contracts",
      artifacts: "out/",
      include: [
        "src/CookieJar.sol/**",
        "src/CookieJarFactory.sol/**",
        "src/CookieJarRegistry.sol/**"
      ]
    }),
    react()
  ]
});
export {
  wagmi_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsid2FnbWkuY29uZmlnLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX2luamVjdGVkX2ZpbGVuYW1lX18gPSBcIkU6XFxcXGhvb2xhbmRcXFxcdjFcXFxcbXlicmFuY2hcXFxcZnJvbnRlbmRcXFxcd2FnbWkuY29uZmlnLnRzXCI7Y29uc3QgX19pbmplY3RlZF9kaXJuYW1lX18gPSBcIkU6XFxcXGhvb2xhbmRcXFxcdjFcXFxcbXlicmFuY2hcXFxcZnJvbnRlbmRcIjtjb25zdCBfX2luamVjdGVkX2ltcG9ydF9tZXRhX3VybF9fID0gXCJmaWxlOi8vL0U6L2hvb2xhbmQvdjEvbXlicmFuY2gvZnJvbnRlbmQvd2FnbWkuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAnQHdhZ21pL2NsaSdcbmltcG9ydCB7IGV0aGVyc2NhbiwgcmVhY3QgfSBmcm9tICdAd2FnbWkvY2xpL3BsdWdpbnMnXG5pbXBvcnQgeyBtYWlubmV0LCBzZXBvbGlhIH0gZnJvbSAnd2FnbWkvY2hhaW5zJ1xuaW1wb3J0IHsgZm91bmRyeSB9IGZyb20gJ0B3YWdtaS9jbGkvcGx1Z2lucydcblxuXG5cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgb3V0OiAnc3JjL2dlbmVyYXRlZC50cycsXG4gIGNvbnRyYWN0czogW10sXG4gIHBsdWdpbnM6IFtcbiAgICBmb3VuZHJ5KHtcbiAgICAgIHByb2plY3Q6ICcuLi9jb250cmFjdHMnLFxuICAgICAgYXJ0aWZhY3RzOiAnb3V0LycsXG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICdzcmMvQ29va2llSmFyLnNvbC8qKicsXG4gICAgICAgICdzcmMvQ29va2llSmFyRmFjdG9yeS5zb2wvKionLFxuICAgICAgICAnc3JjL0Nvb2tpZUphclJlZ2lzdHJ5LnNvbC8qKidcbiAgICAgIF0gICAgfSksXG4gICAgcmVhY3QoKSxcblxuXG4gIF0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UCxTQUFTLG9CQUFvQjtBQUNwUixTQUFvQixhQUFhO0FBRWpDLFNBQVMsZUFBZTtBQUt4QixJQUFPLHVCQUFRLGFBQWE7QUFBQSxFQUMxQixLQUFLO0FBQUEsRUFDTCxXQUFXLENBQUM7QUFBQSxFQUNaLFNBQVM7QUFBQSxJQUNQLFFBQVE7QUFBQSxNQUNOLFNBQVM7QUFBQSxNQUNULFdBQVc7QUFBQSxNQUNYLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFBSyxDQUFDO0FBQUEsSUFDUixNQUFNO0FBQUEsRUFHUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
