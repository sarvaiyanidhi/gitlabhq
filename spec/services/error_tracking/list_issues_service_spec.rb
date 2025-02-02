# frozen_string_literal: true

require 'spec_helper'

describe ErrorTracking::ListIssuesService do
  set(:user) { create(:user) }
  set(:project) { create(:project) }

  let(:sentry_url) { 'https://sentrytest.gitlab.com/api/0/projects/sentry-org/sentry-project' }
  let(:token) { 'test-token' }
  let(:result) { subject.execute }

  let(:error_tracking_setting) do
    create(:project_error_tracking_setting, api_url: sentry_url, token: token, project: project)
  end

  subject { described_class.new(project, user) }

  before do
    expect(project).to receive(:error_tracking_setting).at_least(:once).and_return(error_tracking_setting)

    project.add_reporter(user)
  end

  describe '#execute' do
    context 'with authorized user' do
      context 'when list_sentry_issues returns issues' do
        let(:issues) { [:list, :of, :issues] }

        before do
          expect(error_tracking_setting)
            .to receive(:list_sentry_issues).and_return(issues: issues)
        end

        it 'returns the issues' do
          expect(result).to eq(status: :success, issues: issues)
        end
      end

      include_examples 'error tracking service data not ready', :list_sentry_issues
      include_examples 'error tracking service sentry error handling', :list_sentry_issues
      include_examples 'error tracking service http status handling', :list_sentry_issues
    end

    include_examples 'error tracking service unauthorized user'
    include_examples 'error tracking service disabled'
  end

  describe '#external_url' do
    it 'calls the project setting sentry_external_url' do
      expect(error_tracking_setting).to receive(:sentry_external_url).and_return(sentry_url)

      expect(subject.external_url).to eql sentry_url
    end
  end
end
