# frozen_string_literal: true

module Projects::ErrorTrackingHelper
  def error_tracking_data(current_user, project)
    error_tracking_enabled = !!project.error_tracking_setting&.enabled?

    {
      'index-path' => project_error_tracking_index_path(project,
                                                        format: :json),
      'user-can-enable-error-tracking' => can?(current_user, :admin_operations, project).to_s,
      'enable-error-tracking-link' => project_settings_operations_path(project),
      'error-tracking-enabled' => error_tracking_enabled.to_s,
      'illustration-path' => image_path('illustrations/cluster_popover.svg')
    }
  end

  def error_details_data(project, issue)
    opts = [project, issue, { format: :json }]

    {
      'issue-details-path' => details_namespace_project_error_tracking_index_path(*opts),
      'issue-stack-trace-path' => stack_trace_namespace_project_error_tracking_index_path(*opts)
    }
  end
end
