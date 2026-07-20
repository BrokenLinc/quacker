import { useGroups } from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { SignInPlacementFromAuth } from '@@components/auth/SignInPlacementFromAuth';
import { Header } from '@@components/Header';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

const HomePage: React.FC = () => {
  return (
    <SignInPlacementFromAuth>
      <Header />
      <RequireAuth>
        <UI.Box maxW="480px" mx="auto" p={4}>
          <GroupCardList />
        </UI.Box>
      </RequireAuth>
    </SignInPlacementFromAuth>
  );
};
export default HomePage;

const GroupCardList: React.FC = () => {
  const [groups, groupLoading, groupError] = useGroups({
    limit: 100,
    channelId: 'home',
  });

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
