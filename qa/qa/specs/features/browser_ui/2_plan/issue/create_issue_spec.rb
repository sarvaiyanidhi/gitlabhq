# frozen_string_literal: true

module QA
  context 'Plan', :smoke do
    describe 'Issue creation' do
      let(:issue_title) { 'issue title' }

      before do
        Runtime::Browser.visit(:gitlab, Page::Main::Login)
        Page::Main::Login.perform(&:sign_in_using_credentials)
      end

      it 'user creates an issue' do
        Resource::Issue.fabricate_via_browser_ui! do |issue|
          issue.title = issue_title
        end

        Page::Project::Menu.perform(&:click_issues)

        expect(page).to have_content(issue_title)
      end

      context 'when using attachments in comments', :object_storage do
        let(:gif_file_name) { 'banana_sample.gif' }
        let(:file_to_attach) do
          File.absolute_path(File.join('spec', 'fixtures', gif_file_name))
        end

        before do
          issue = Resource::Issue.fabricate_via_api! do |issue|
            issue.title = issue_title
          end

          issue.visit!
        end

        it 'user comments on an issue with an attachment' do
          Page::Project::Issue::Show.perform do |show|
            show.comment('See attached banana for scale', attachment: file_to_attach)

            expect(show.noteable_note_item.find("img[src$='#{gif_file_name}']")).to be_visible
          end
        end
      end
    end
  end
end
