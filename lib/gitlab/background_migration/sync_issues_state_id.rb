# frozen_string_literal: true
# rubocop:disable Style/Documentation

module Gitlab
  module BackgroundMigration
    class SyncIssuesStateId
      include Helpers::Reschedulable

      def perform(start_id, end_id)
        Rails.logger.info("Issues - Populating state_id: #{start_id} - #{end_id}")

        reschedule_if_needed([start_id, end_id]) do
          ActiveRecord::Base.connection.execute <<~SQL
            UPDATE issues
            SET state_id =
              CASE state
              WHEN 'opened' THEN 1
              WHEN 'closed' THEN 2
              END
            WHERE state_id IS NULL
            AND id BETWEEN #{start_id} AND #{end_id}
          SQL
        end
      end

      private

      def need_reschedule?
        wait_for_deadtuple_vacuum?('issues')
      end
    end
  end
end
