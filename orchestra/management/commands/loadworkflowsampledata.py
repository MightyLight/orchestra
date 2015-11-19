from importlib import import_module

from django.core.management.base import BaseCommand
from django.db import transaction

from orchestra.models import Workflow
from orchestra.models import WorkflowVersion


LOAD_SCRIPT_MODULE = 'load_sample_data'


class Command(BaseCommand):
    help = ('Loads sample data for a workflow version into the database. '
            'Workflows must include a `{}.py` module in their top-level '
            'directory containing a `load(workflow_version)` function that '
            'loads sample data for the version. Otherwise, this command will '
            'do nothing.'.format(LOAD_SCRIPT_MODULE))

    def add_arguments(self, parser):
        parser.add_argument(
            'workflow_slug',
            help='The unique identifier of the workflow.')
        parser.add_argument(
            'version_slug',
            help='The version of the workflow to load.')

    def handle(self, *args, **options):
        # Verify that the workflow exists
        try:
            workflow = Workflow.objects.get(slug=options['workflow_slug'])
        except Workflow.DoesNotExist:
            print('Workflow {} has not been loaded into the database. Please '
                  'load if before adding sample data.'
                  .format(options['workflow_slug']),
                  file=self.stderr)
            return

        # Verify that the version exists
        try:
            version = workflow.versions.get(slug=options['version_slug'])
        except WorkflowVersion.DoesNotExist:
            print('Version {} does not exist. Not loading sample data.'
                  .format(options['version_slug']),
                  file=self.stderr)
            return

        # Import the load function and run it.
        load_function_dict = workflow.sample_data_load_function
        if not load_function_dict:
            print('Workflow {} does not provide sample data. Not loading '
                  'sample data.'.format(options['workflow_slug']),
                  file=self.stderr)
            return

        try:
            load_function_module = import_module(load_function_dict['module'])
            load_function = getattr(load_function_module,
                                    load_function_dict['name'])
            with transaction.atomic():
                load_function(version)
            print('Successfully loaded sample data for {}'.format(version),
                  file=self.stdout)
        except Exception as e:
            print('An error occurred while loading sample data: {}'.format(e),
                  file=self.stderr)
