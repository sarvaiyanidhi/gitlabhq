# frozen_string_literal: true

# Fetches the system metrics dashboard and formats the output.
# Use Gitlab::Metrics::Dashboard::Finder to retrive dashboards.
module Metrics
  module Dashboard
    class SystemDashboardService < ::Metrics::Dashboard::BaseService
      SYSTEM_DASHBOARD_PATH = 'config/prometheus/common_metrics.yml'
      SYSTEM_DASHBOARD_NAME = 'Default'

      SEQUENCE = [
        STAGES::CommonMetricsInserter,
        STAGES::ProjectMetricsInserter,
        STAGES::EndpointInserter,
        STAGES::Sorter
      ].freeze

      class << self
        def all_dashboard_paths(_project)
          [{
            path: SYSTEM_DASHBOARD_PATH,
            display_name: SYSTEM_DASHBOARD_NAME,
            default: true,
            system_dashboard: true
          }]
        end

        def system_dashboard?(filepath)
          filepath == SYSTEM_DASHBOARD_PATH
        end
      end

      private

      def cache_key
        "metrics_dashboard_#{dashboard_path}"
      end

      def dashboard_path
        SYSTEM_DASHBOARD_PATH
      end

      # Returns the base metrics shipped with every GitLab service.
      def get_raw_dashboard
        yml = File.read(Rails.root.join(dashboard_path))

        YAML.safe_load(yml)
      end

      def sequence
        SEQUENCE
      end
    end
  end
end

Metrics::Dashboard::SystemDashboardService.prepend_if_ee('EE::Metrics::Dashboard::SystemDashboardService')
