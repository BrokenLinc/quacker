import { useGroups } from '@@api';
import { Header } from '@@components/Header';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

const HomePage: React.FC = () => {
  return (
    <React.Fragment>
      <Header />
      <UI.Box maxW="480px" mx="auto" p={4}>
        <GroupCardList />
      </UI.Box>
    </React.Fragment>
  );
};
export default HomePage;

const GroupCardList: React.FC = () => {
  const [groups, groupLoading, groupError] = useGroups({ limit: 100 });

  if (groupLoading) return <UI.Spinner />;
  if (groupError) return null;
  if (!groups?.length) return null;

  return (
    <UI.VStack alignItems="stretch" w="full" fontWeight="bold">
      {groups?.map((group) => (
        <UI.Card
          as={UI.RouteLink}
          key={group.id}
          route={routes.group(group.id)}
          shadow="lg"
        >
          <UI.CardBody>
            <UI.HStack>
              <UI.Text>{group.name}</UI.Text>
              <UI.Icon icon={faChevronRight} ml="auto" />
            </UI.HStack>
          </UI.CardBody>
        </UI.Card>
      ))}
    </UI.VStack>
  );
};
